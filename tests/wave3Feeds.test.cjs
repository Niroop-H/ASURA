const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('src/lib/operationalFeeds.js','utf8');
const loader=import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const rss='<rss version="2.0"><channel>'+
 '<item><title>SEC Official Trading Suspension Notice</title>'+
 '<link>https://www.sec.gov/enforcement-litigation/trading-suspensions</link>'+
 '<pubDate>Wed, 11 Nov 2026 14:00:00 GMT</pubDate></item></channel></rss>';
const buoy='#YY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP DEWP VIS TIDE\n'+
 '#yr mo dy hr mn degT m/s m/s m sec sec degT hPa degC degC degC nmi ft\n'+
 '2026 11 12 08 30 270 6.5 8.1 2.4 9 8 300 1013 12 15 10 MM MM\n'+
 '2026 11 12 08 20 280 MM 7.0 2.5 9 8 320 1013 12 15 10 MM MM\n'+
 '2026 11 12 08 10 270 9.0 10 99.0 9 8 300 1013 12 15 10 MM MM\n';
test('SEC and NOAA NDBC are catalogued but not operationally approved',async()=>{
 const {OPERATIONAL_SOURCE_IDS,operationalDefinitions}=await loader;
 for(const id of ['sec_suspensions','noaa_ndbc_buoy']){
  assert.ok(OPERATIONAL_SOURCE_IDS.includes(id));
  const d=operationalDefinitions().find(x=>x.id===id);
  assert.match(d.url,/^https:\/\//);
  assert.ok(d.scope&&d.maxContentAgeMinutes>0);
 }
 assert.equal(new Set(OPERATIONAL_SOURCE_IDS).size,OPERATIONAL_SOURCE_IDS.length);
});
test('SEC RSS records are notices, not real-time exchange halts',async()=>{
 const {parseOperationalFixture}=await loader;
 const x=parseOperationalFixture('sec_suspensions',rss);
 assert.equal(x.sourceCount,1);
 assert.equal(x.records[0].dataCategory,'published-market-enforcement-notice');
 assert.equal(x.records[0].observedAt,'2026-11-11T14:00:00.000Z');
 assert.match(x.note,/NOT live halt status/);
 const empty=parseOperationalFixture('sec_suspensions','<rss><channel></channel></rss>');
 assert.equal(empty.records.length,0);
 assert.equal(empty.sourceTime,null);
 assert.throws(()=>parseOperationalFixture('sec_suspensions','{}'),/RSS schema mismatch/);
});
test('NOAA NDBC correctly handles fixed station, units, missing fields and UTC date',async()=>{
 const {parseOperationalFixture}=await loader;
 const x=parseOperationalFixture('noaa_ndbc_buoy',buoy);
 assert.equal(x.sourceCount,3);
 assert.equal(x.records.length,3);
 assert.equal(x.records[0].observedAt,'2026-11-12T08:30:00.000Z');
 assert.equal(x.records[0].windSpeedMs,6.5);
 assert.equal(x.records[0].waveHeightM,2.4);
 assert.equal(x.records[1].windSpeedMs,null);
 assert.equal(x.records[1].waveHeightM,2.5);
 assert.equal(x.records[2].waveHeightM,null);
 assert.match(x.note,/not zero/i);
 assert.equal(x.records[0].url,'https://www.ndbc.noaa.gov/station_page.php?station=46042');
 assert.throws(()=>parseOperationalFixture('noaa_ndbc_buoy','garbage'),/header mismatch/);
 assert.throws(()=>parseOperationalFixture('noaa_ndbc_buoy','#YY MM DD hh mm WSPD\n#yr mo dy hr mn m\/s\n2026 11 12 08 30 5.1'),/required observation column/);
});
test('live retrieval preserves source URL, raw digest and explicit unapproved state',async()=>{
 const {getOperationalSource}=await loader;
 const fake=async()=>({ok:true,status:200,headers:new Headers({'content-type':'text/plain'}),text:async()=>buoy});
 const x=await getOperationalSource('noaa_ndbc_buoy','',{fetcher:fake});
 assert.equal(x.success,true);
 assert.equal(x.status.transport,'ok');
 assert.equal(x.status.sourceCount,3);
 assert.equal(x.records[0].source,'noaa_ndbc_buoy');
 assert.equal(x.status.usableForOperationalClaims,false);
 assert.match(x.rawSha256,/^[a-f0-9]{64}$/);
});
