const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createHash}=require('node:crypto');
const source=fs.readFileSync('src/lib/operationalFeeds.js','utf8');
let loader=import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const faaXml='<AIRPORT_STATUS_INFORMATION><Update_Time>Thu Nov 12 07:49:32 2026 GMT</Update_Time><Delay_type><Name>Airport Closures</Name><Airport_Closure_List><Airport><ARPT>LAX</ARPT><Reason>Published airport closure</Reason><Start>Nov 12 at 08:00 UTC.</Start></Airport></Airport_Closure_List></Delay_type></AIRPORT_STATUS_INFORMATION>';
const noaa=JSON.stringify({type:'FeatureCollection',features:[
 {properties:{event:'Winter Storm Warning',areaDesc:'California',headline:'Published NWS alert',
  sent:'2026-11-12T07:49:00Z',expires:'2026-11-12T20:00:00Z',severity:'Severe',
  '@id':'https://api.weather.gov/alerts/urn:oid:sample'}}]});
const fema=JSON.stringify({DisasterDeclarationsSummaries:[{femaDeclarationString:'DR-1234-CA',
 disasterNumber:1234,state:'CA',incidentType:'Flood',declarationDate:'2026-11-10T00:00:00.000Z'}]});
const ics='<?xml version="1.0"?><rss version="2.0"><channel><item><title>Example ICS Advisory</title><link>https://www.cisa.gov/example</link><pubDate>Wed, 11 Nov 2026 15:00:00 GMT</pubDate></item></channel></rss>';
const nrc='<?xml version="1.0"?><rss><channel><item><title><![CDATA[ Public event ]]></title><link><![CDATA[ https://www.nrc.gov/example ]]></link></item></channel></rss>';
const tfr=JSON.stringify([{type:'HAZARDS',mod_abs_time:'202611120745'},{type:'HAZARDS',mod_abs_time:'202611120741'},{type:'SECURITY',mod_abs_time:'202611120732'}]);
const port=JSON.stringify({type:'FeatureCollection',features:[{properties:{title:'Monthly_TradeNow'}}]});
const fetcher=body=>async()=>({ok:true,status:200,headers:new Headers({'content-type':'application/json'}),text:async()=>body});

test('freshness honours source event clock, not fetch clock',async()=>{
 const {freshnessStatus}=await loader;
 assert.equal(freshnessStatus('2026-11-12T12:10:00Z','2026-11-12T12:14:00Z',20).state,'fresh');
 assert.equal(freshnessStatus('2026-11-11T12:10:00Z','2026-11-12T12:14:00Z',20).state,'stale');
 assert.equal(freshnessStatus(null,'2026-11-12T12:14:00Z',20).state,'unknown');
 assert.equal(freshnessStatus('2026-11-13T12:10:00Z','2026-11-12T12:14:00Z',20).state,'invalid');
});
test('FAA NAS parser returns airport notices but not aircraft positions',async()=>{
 const {parseOperationalFixture}=await loader;
 const x=parseOperationalFixture('faa_nas',faaXml);
 assert.equal(x.records.length,1);assert.match(x.records[0].title,/LAX — Airport Closures/);
 assert.equal(x.records[0].dataCategory,'published-airport-status');
 assert.ok(x.sourceTime);
});
test('FAA TFR parser exposes aggregate categories without geometry or sensitive locations',async()=>{
 const {parseOperationalFixture}=await loader;
 const x=parseOperationalFixture('faa_tfr',tfr);
 assert.equal(x.sourceCount,3);assert.equal(x.records.length,2);
 assert.match(x.records[0].title,/2 published TFR notices/);
 assert.ok(!JSON.stringify(x.records).includes('facility'));
});
test('NOAA active-alert schema is checked and its alert expiration retained',async()=>{
 const {parseOperationalFixture}=await loader;
 const x=parseOperationalFixture('nws_alerts',noaa,'CA');
 assert.equal(x.records.length,1);
 assert.equal(x.records[0].expiresAt,'2026-11-12T20:00:00.000Z');
 assert.throws(()=>parseOperationalFixture('nws_alerts','{}','CA'),/schema mismatch/);
});
test('FEMA declarations are administrative records, not live disaster metrics',async()=>{
 const {parseOperationalFixture}=await loader;
 const x=parseOperationalFixture('fema_disasters',fema);
 assert.equal(x.records[0].dataCategory,'federal-disaster-declaration');
 assert.match(x.note,/declaration date/i);
});
test('CISA ICS is defensive publisher content; NRC is aggregate only',async()=>{
 const {parseOperationalFixture}=await loader;
 const a=parseOperationalFixture('cisa_ics',ics);
 assert.equal(a.records.length,1);assert.equal(a.records[0].observedAt,'2026-11-11T15:00:00.000Z');
 const b=parseOperationalFixture('nrc_events',nrc);
 assert.equal(b.records.length,1);assert.equal(b.records[0].observedAt,null);
 assert.match(b.records[0].description,/not an incident count/i);
});
test('IMF catalog is not misrepresented as live AIS or trade volume',async()=>{
 const {getOperationalSource}=await loader;
 const x=await getOperationalSource('imf_portwatch','',{fetcher:fetcher(port)});
 assert.equal(x.success,true);assert.equal(x.status.usableForOperationalClaims,false);
 assert.equal(x.records[0].dataCategory,'catalogue-entry-only');
});
test('invalid state and failed source both fail visibly and emit no records',async()=>{
 const {getOperationalSource}=await loader;
 const noState=await getOperationalSource('nws_alerts','Weather warnings in Bengaluru',
  {fetcher:fetcher(noaa)});
 assert.equal(noState.success,false);
 const down=await getOperationalSource('faa_nas','',{fetcher:async()=>({ok:false,status:502})});
 assert.equal(down.success,false);assert.equal(down.status.transport,'down');
 assert.deepEqual(down.records,[]);
});
test('unknown content time is not a verified operational reading; digest is reproducible',async()=>{
 const {getOperationalSource}=await loader;
 const n=await getOperationalSource('nrc_events','',{fetcher:fetcher(nrc)});
 assert.equal(n.status.content,'unknown');assert.equal(n.status.usableForOperationalClaims,false);
 const x=await getOperationalSource('faa_nas','',{fetcher:fetcher(faaXml)});
 const checksum=createHash('sha256').update(JSON.stringify({
  id:'faa_nas',checkedAt:x.checkedAt,status:x.status,records:x.records
 })).digest('hex');
 assert.equal(x.sha256,checksum);
});
