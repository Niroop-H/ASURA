const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createHash}=require('node:crypto');
const source=fs.readFileSync('src/lib/operationalFeeds.js','utf8');
const loader=import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const fakeResponse=(text)=>async()=>({ok:true,status:200,
 headers:new Headers({'content-type':'application/json'}),
 text:async()=>text});
const kp=JSON.stringify([
 {time_tag:'2026-11-11T21:00:00',Kp:2.33,a_running:10,station_count:8},
 {time_tag:'2026-11-12T00:00:00',Kp:3.67,a_running:20,station_count:8}
]);
const halts='<rss version="2.0" xmlns:ndaq="https://www.nasdaqtrader.com/"><channel>'+
 '<item><title>Market Halt ABCD</title><description>Issuer notice</description>'+
 '<pubDate>Thu, 12 Nov 2026 07:35:00 GMT</pubDate><ndaq:Symbol>ABCD</ndaq></item></channel></rss>';
const federal=JSON.stringify({count:1,results:[{
 title:'Public agency notice',type:'Notice',publication_date:'2026-11-12',
 document_number:'2026-001',html_url:'https://www.federalregister.gov/d/2026-001'
}]});
const fcdo=JSON.stringify({schema_name:'travel_advice',title:'Japan travel advice',
 description:'UK government published travel advice for Japan.',
 web_url:'https://www.gov.uk/foreign-travel-advice/japan',
 public_updated_at:'2026-11-10T10:00:00Z'});

test('four official-source contracts have bounded definitions and are listed in the probe catalogue',async()=>{
 const {OPERATIONAL_SOURCE_IDS,operationalDefinitions}=await loader;
 const ids=['noaa_swpc_kp','nasdaq_halts','federal_register','fcdo_travel'];
 for(const id of ids){
  assert.ok(OPERATIONAL_SOURCE_IDS.includes(id));
  const definition=operationalDefinitions().find(x=>x.id===id);
  assert.match(definition.url,/^https:\/\//);
  assert.ok(definition.cadenceMinutes>0&&definition.maxContentAgeMinutes>0);
  assert.ok(definition.scope);
 }
 assert.equal(new Set(OPERATIONAL_SOURCE_IDS).size,OPERATIONAL_SOURCE_IDS.length);
});

test('NOAA published Kp rows preserve timestamp, numeric units, and avoid interference claims',async()=>{
 const {parseOperationalFixture}=await loader;
 const r=parseOperationalFixture('noaa_swpc_kp',kp);
 assert.equal(r.sourceCount,2);
 assert.equal(r.records[0].observedAt,'2026-11-12T00:00:00.000Z');
 assert.equal(r.records[0].metric,'Kp');
 assert.equal(r.records[0].value,3.67);
 assert.equal(r.records[0].unit,'dimensionless');
 assert.match(r.note,/not a real-time GPS-jamming detector/i);
 assert.throws(()=>parseOperationalFixture('noaa_swpc_kp','{"invalid":true}'),/schema mismatch/);
 assert.throws(()=>parseOperationalFixture('noaa_swpc_kp','[{"time_tag":"bad","Kp":90}]'),/observations invalid/);
});

test('Nasdaq RSS is parsed as published notices without treating an empty feed as safe',async()=>{
 const {parseOperationalFixture}=await loader;
 const x=parseOperationalFixture('nasdaq_halts',halts);
 assert.equal(x.sourceCount,1);
 assert.equal(x.records[0].dataCategory,'published-trading-halt-notice');
 assert.equal(x.records[0].observedAt,'2026-11-12T07:35:00.000Z');
 const empty=parseOperationalFixture('nasdaq_halts','<rss><channel></channel></rss>');
 assert.equal(empty.sourceCount,0);
 assert.equal(empty.sourceTime,null);
 assert.match(empty.note,/does not prove trading is unrestricted/i);
});

test('Nasdaq live retrieval requires express operator licence acceptance',async()=>{
 const {getOperationalSource}=await loader;
 const prev=process.env.NASDAQ_HALTS_TERMS_ACCEPTED;
 delete process.env.NASDAQ_HALTS_TERMS_ACCEPTED;
 try{
  let called=false;
  const r=await getOperationalSource('nasdaq_halts','',{fetcher:async()=>{called=true;throw Error('Unexpected network call')}});
  assert.equal(called,false);
  assert.equal(r.success,false);
  assert.equal(r.status.transport,'blocked');
  assert.equal(r.status.usableForOperationalClaims,false);
  assert.deepEqual(r.records,[]);
 }finally{
  if(prev===undefined)delete process.env.NASDAQ_HALTS_TERMS_ACCEPTED;
  else process.env.NASDAQ_HALTS_TERMS_ACCEPTED=prev;
 }
});

test('Federal Register parser distinguishes published records from in-force law',async()=>{
 const {parseOperationalFixture}=await loader;
 const x=parseOperationalFixture('federal_register',federal);
 assert.equal(x.sourceCount,1);
 assert.equal(x.records[0].observedAt,'2026-11-12T00:00:00.000Z');
 assert.match(x.records[0].description,/official PDF/);
 assert.match(x.note,/not a stream of currently applicable law/);
 assert.throws(()=>parseOperationalFixture('federal_register','{"count":2,"results":{}}'),/schema mismatch/);
});

test('FCDO is constrained to a named country and preserves official publication time',async()=>{
 const {getOperationalSource}=await loader;
 let requested='';
 const r=await getOperationalSource('fcdo_travel','What is the FCDO travel advice for Japan?',{
  fetcher:async(url)=>{requested=url;return (await fakeResponse(fcdo)());}
 });
 assert.equal(requested,'https://www.gov.uk/api/content/foreign-travel-advice/japan');
 assert.equal(r.success,true);
 assert.equal(r.records[0].observedAt,'2026-11-10T10:00:00.000Z');
 assert.equal(r.records[0].url,'https://www.gov.uk/foreign-travel-advice/japan');
 assert.equal(r.status.usableForOperationalClaims,false);
 assert.equal(r.rawSha256,createHash('sha256').update(fcdo).digest('hex'));
 assert.equal(r.records[0].sourceUrl,requested);
 const noCountry=await getOperationalSource('fcdo_travel','What is the current UK advisory?',{
  fetcher:async()=>{throw Error('Should not fetch without country')}
 });
 assert.equal(noCountry.status.transport,'down');
 assert.match(noCountry.status.reason,/Specify a supported country/);
});

test('full readiness probe does not silently truncate after seven providers',async()=>{
 const {OPERATIONAL_SOURCE_IDS,probeOperationalSources}=await loader;
 const r=await probeOperationalSources(OPERATIONAL_SOURCE_IDS,{
  fetcher:async()=>({ok:false,status:503})
 });
 assert.equal(r.checkCount,OPERATIONAL_SOURCE_IDS.length);
 assert.equal(r.sources.length,OPERATIONAL_SOURCE_IDS.length);
 assert.equal(r.evidencePacks.length,OPERATIONAL_SOURCE_IDS.length);
 assert.equal(r.readyCount,0);
 assert.equal(r.checksNotCertification,true);
 assert.ok(r.sources.some(x=>x.transport==='down'));
 assert.ok(r.sources.some(x=>x.transport==='blocked'));
});

test('verified content is not operational authorization and raw payload has an independently checkable hash',async()=>{
 const {getOperationalSource}=await loader;
 const r=await getOperationalSource('noaa_swpc_kp','',{fetcher:fakeResponse(kp)});
 assert.equal(r.success,true);
 assert.equal(r.status.transport,'ok');
 assert.equal(r.status.usableForOperationalClaims,false);
 assert.equal(r.rawSha256,createHash('sha256').update(kp).digest('hex'));
 assert.ok(new Date(r.checkedAt).getTime()>=new Date(r.status.pullStartedAt).getTime());
 assert.ok(r.records.every(x=>x.licensing&&x.retrievedAt&&x.sourceUrl));
});
