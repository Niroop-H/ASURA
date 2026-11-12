const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const source=fs.readFileSync('src/lib/operationalFeeds.js','utf8');
const loader=import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const ok=text=>async(url)=>({ok:true,status:200,
 headers:new Headers({'content-type':'application/json'}),text:async()=>text});
const gdacs='<rss version="2.0"><channel><item><title><![CDATA[ Public disaster alert ]]></title>'+
 '<link>https://www.gdacs.org/report.aspx?eventid=123</link><pubDate>Thu, 12 Nov 2026 04:00:00 GMT</pubDate></item></channel></rss>';
const uscg='<rss><channel><item><title>District local notice</title>'+
 '<link>https://navcen.uscg.gov/</link><pubDate>Wed, 11 Nov 2026 12:00:00 GMT</pubDate></item></channel></rss>';
const nasa=JSON.stringify([{gstID:'GST-2026-001',startTime:'2026-11-12T04:00Z',
 link:'https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/GST/1',
 allKpIndex:[{observedTime:'2026-11-12T07:00Z',kpIndex:5},{kpIndex:6}]}]);
const treasury=JSON.stringify({data:[{record_date:'2026-11-11',
 tot_pub_debt_out_amt:'38200123456789.99',debt_held_public_amt:'30000123456789.98',
 intragov_hold_amt:'8200000000000.01'}]});
const dvids=JSON.stringify({page_info:{total_results:1},results:[{
 type:'news',title:'Public military exercise announcement',
 date_published:'2026-11-12T04:30:00Z',
 url:'https://www.dvidshub.net/news/12345/public-announcement',
 short_description:'Published statement',unit_name:'Example publishing unit'
}]});
const imf=JSON.stringify({features:[{attributes:{portid:'PORT123',portname:'Published test port',
 date:'2026-11-02',portcalls:5,import:700,export:900}}]});

test('all six extra sources have documented bounds and are registered',async()=>{
 const {OPERATIONAL_SOURCE_IDS,operationalDefinitions}=await loader;
 const ids=['gdacs_alerts','uscg_lnm','nasa_donki','treasury_debt','dvids_news','imf_portwatch_daily'];
 assert.equal(new Set(OPERATIONAL_SOURCE_IDS).size,OPERATIONAL_SOURCE_IDS.length);
 for(const id of ids){
  assert.ok(OPERATIONAL_SOURCE_IDS.includes(id),id);
  const d=operationalDefinitions().find(x=>x.id===id);
  assert.match(d.url,/^https:\/\//);
  assert.ok(d.cadenceMinutes>0&&d.maxContentAgeMinutes>0);
  assert.ok(d.scope&&d.licenseStatus);
 }
});

test('GDACS and USCG notice headlines retain provider dates and no all-clear implication',async()=>{
 const {parseOperationalFixture}=await loader;
 const g=parseOperationalFixture('gdacs_alerts',gdacs);
 assert.equal(g.records[0].dataCategory,'published-disaster-alert');
 assert.equal(g.records[0].observedAt,'2026-11-12T04:00:00.000Z');
 assert.match(g.note,/NOT an all-clear/);
 const u=parseOperationalFixture('uscg_lnm',uscg);
 assert.equal(u.records[0].dataCategory,'published-maritime-notice');
 const empty=parseOperationalFixture('gdacs_alerts','<rss><channel></channel></rss>');
 assert.equal(empty.sourceTime,null);
 assert.equal(empty.sourceCount,0);
 assert.throws(()=>parseOperationalFixture('uscg_lnm','{}'),/RSS schema mismatch/);
});

test('NASA DONKI preserves event time and does not claim GNSS interference detection',async()=>{
 const {parseOperationalFixture}=await loader;
 const x=parseOperationalFixture('nasa_donki',nasa);
 assert.equal(x.sourceCount,1);
 assert.equal(x.records[0].maxKp,6);
 assert.equal(x.records[0].observedAt,'2026-11-12T04:00:00.000Z');
 assert.match(x.records[0].description,/not realtime GNSS-disruption/);
 const none=parseOperationalFixture('nasa_donki','[]');
 assert.equal(none.sourceCount,0);
 assert.equal(none.sourceTime,null);
 assert.throws(()=>parseOperationalFixture('nasa_donki','{"error":true}'),/schema mismatch/);
});

test('Treasury currency stays exact string without IEEE754 rounding or false live claims',async()=>{
 const {parseOperationalFixture}=await loader;
 const x=parseOperationalFixture('treasury_debt',treasury);
 assert.equal(x.sourceCount,1);
 assert.equal(x.records[0].totalDebtUSD,'38200123456789.99');
 assert.equal(x.records[0].debtHeldPublicUSD,'30000123456789.98');
 assert.equal(x.records[0].unit,'USD');
 assert.equal(x.records[0].observedAt,'2026-11-11T00:00:00.000Z');
 assert.throws(()=>parseOperationalFixture('treasury_debt',treasury.replace('38200123456789.99','NaN')),/invalid date or exact decimal/);
});

test('DVIDS key gate fails visibly and does not call API without credentials',async()=>{
 const {getOperationalSource,parseOperationalFixture}=await loader;
 const original=process.env.DVIDS_API_KEY;delete process.env.DVIDS_API_KEY;
 try{
  let called=false;
  const r=await getOperationalSource('dvids_news','',{fetcher:async()=>{called=true;throw Error('unexpected')}});
  assert.equal(called,false);assert.equal(r.success,false);
  assert.equal(r.status.transport,'blocked');assert.deepEqual(r.records,[]);
 }finally{if(original===undefined)delete process.env.DVIDS_API_KEY;
  else process.env.DVIDS_API_KEY=original;}
 const x=parseOperationalFixture('dvids_news',dvids);
 assert.equal(x.records[0].dataCategory,'official-published-defence-media');
 assert.equal(x.records[0].observedAt,'2026-11-12T04:30:00.000Z');
});

test('DVIDS key stays out of status URL, evidence hashes and records',async()=>{
 const {getOperationalSource}=await loader;
 const old=process.env.DVIDS_API_KEY;
 process.env.DVIDS_API_KEY='key-TOPSECRETVALUE123';
 try{
  let requested='';
  const r=await getOperationalSource('dvids_news','',{
   fetcher:async(url)=>{requested=url;return ok(dvids)();}
  });
  assert.match(requested,/api_key=key-TOPSECRETVALUE123/);
  assert.equal(r.success,true);
  assert.equal(r.status.usableForOperationalClaims,false);
  assert.equal(JSON.stringify(r).includes('TOPSECRETVALUE'),false);
  assert.equal(r.rawSha256,crypto.createHash('sha256').update(dvids).digest('hex'));
 }finally{if(old===undefined)delete process.env.DVIDS_API_KEY;
  else process.env.DVIDS_API_KEY=old;}
});

test('IMF daily estimates require explicit reuse rights; no geometry or vessel tracking',async()=>{
 const {getOperationalSource,parseOperationalFixture}=await loader;
 const prev=process.env.IMF_PORTWATCH_REUSE_AUTHORIZED;
 delete process.env.IMF_PORTWATCH_REUSE_AUTHORIZED;
 try{
  let called=false;
  const denied=await getOperationalSource('imf_portwatch_daily','',{
   fetcher:async()=>{called=true;throw Error('unexpected fetch')}
  });
  assert.equal(called,false);assert.equal(denied.status.transport,'blocked');
  const x=parseOperationalFixture('imf_portwatch_daily',imf);
  assert.equal(x.sourceCount,1);
  assert.equal(x.records[0].observedAt,'2026-11-02T00:00:00.000Z');
  assert.equal(x.records[0].dataCategory,'delayed-published-port-trade-estimate');
  assert.equal(JSON.stringify(x.records).includes('geometry'),false);
  assert.throws(()=>parseOperationalFixture('imf_portwatch_daily','{"error":{"code":403}}'),/ArcGIS returned an error/);
  process.env.IMF_PORTWATCH_REUSE_AUTHORIZED='true';
  const permitted=await getOperationalSource('imf_portwatch_daily','',{fetcher:ok(imf)});
  assert.equal(permitted.success,true);
  assert.equal(permitted.status.usableForOperationalClaims,false);
 }finally{if(prev===undefined)delete process.env.IMF_PORTWATCH_REUSE_AUTHORIZED;
  else process.env.IMF_PORTWATCH_REUSE_AUTHORIZED=prev;}
});

test('no silent omission from 17-source assurance, separate network and content status',async()=>{
 const {OPERATIONAL_SOURCE_IDS,probeOperationalSources}=await loader;
 const x=await probeOperationalSources(OPERATIONAL_SOURCE_IDS,{
  fetcher:async()=>({ok:false,status:503})
 });
 assert.equal(x.checkCount,OPERATIONAL_SOURCE_IDS.length);
 assert.equal(x.evidencePacks.length,OPERATIONAL_SOURCE_IDS.length);
 assert.equal(x.sources.length,OPERATIONAL_SOURCE_IDS.length);
 assert.equal(x.readyCount,0);
 assert.ok(x.sources.some(x=>x.transport==='blocked'));
 assert.ok(x.sources.some(x=>x.transport==='down'));
});
