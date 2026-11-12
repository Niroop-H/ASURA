#!/usr/bin/env node
/**
 * Read-only upstream source smoke probe.
 * This captures source status and content checksums, not data records or secrets.
 * Passing this check is not operational certification.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
const code=await readFile(new URL('../src/lib/operationalFeeds.js',import.meta.url),'utf8');
const {OPERATIONAL_SOURCE_IDS,operationalDefinitions,getOperationalSource}=
 await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const definitions=new Map(operationalDefinitions().map(d=>[d.id,d]));
const DEFAULT=[
 'faa_nas','faa_tfr','nws_alerts','fema_disasters','cisa_ics',
 'nrc_events','imf_portwatch','noaa_swpc_kp','federal_register',
 'fcdo_travel','gdacs_alerts','uscg_lnm','nasa_donki','treasury_debt',
 'sec_suspensions','noaa_ndbc_buoy'
];
const args=process.argv.slice(2);
const selectedArg=args.find(x=>x.startsWith('--sources='))?.slice('--sources='.length);
const outputArg=args.find(x=>x.startsWith('--output='))?.slice('--output='.length);
const selected=selectedArg?selectedArg.split(',').filter(Boolean):DEFAULT;
const ids=[...new Set(selected)];
if(!ids.length||ids.some(id=>!OPERATIONAL_SOURCE_IDS.includes(id))){
 console.error('Invalid source selection. Only registered source IDs are accepted.');
 process.exit(2);
}
if(ids.length>24)throw Error('Refusing more than 24 checks in one run');
const output=outputArg||'artifacts/source-smoke-report.json';
if(!/^[-\w./]+\.json$/.test(output)||output.includes('..')||output.startsWith('/')){
 console.error('Output must be a relative JSON file path under the workspace.');
 process.exit(2);
}
const startedAt=new Date().toISOString(),results=[];
let next=0;
async function worker(){
 for(;;){
  const n=next++;
  if(n>=ids.length)return;
  const id=ids[n],definition=definitions.get(id);
  const start=performance.now();
  const result=await getOperationalSource(id,'',{healthProbe:true,timeoutMs:10000});
  const status=result.status||{};
  const elapsedMs=Math.round(performance.now()-start);
  results[n]={
   id,name:definition.label,url:definition.url,
   transport:status.transport||'unknown',content:status.content||'unknown',
   reason:status.reason||null,
   sourceTime:status.sourceTime||null,retrievedAt:status.retrievedAt||null,
   latencyMs:elapsedMs,recordCount:result.records?.length||0,
   sourceCount:status.sourceCount??null,cadenceMinutes:definition.cadenceMinutes,
   maxContentAgeMinutes:definition.maxContentAgeMinutes,
   licensing:definition.licenseStatus,rawSha256:result.rawSha256||null,
   evidenceSha256:result.sha256||null,usableForOperationalClaims:false
  };
  console.log(id+': transport='+results[n].transport+' content='+results[n].content+
   ' elapsed='+elapsedMs+'ms records='+results[n].recordCount);
 }
}
await Promise.all(Array.from({length:Math.min(3,ids.length)},()=>worker()));
const report={
 schemaVersion:1,checkedAt:new Date().toISOString(),startedAt,
 source:'ASURA automated public endpoint probe',
 disclaimer:'Endpoint probe only; not a security review, licence grant, accuracy certification or continuous availability.',
 sampleCount:ids.length,
 transportOk:results.filter(x=>x.transport==='ok').length,
 transportDown:results.filter(x=>x.transport==='down').length,
 licenceBlocked:results.filter(x=>x.transport==='blocked').length,
 freshContent:results.filter(x=>x.content==='fresh').length,
 status:'development-observation-only',results
};
report.checksumSha256=createHash('sha256').update(JSON.stringify(report)).digest('hex');
await mkdir(output.split('/').slice(0,-1).join('/')||'.',{recursive:true});
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({
 output,checkedAt:report.checkedAt,sampleCount:report.sampleCount,
 transportOk:report.transportOk,transportDown:report.transportDown,
 licenceBlocked:report.licenceBlocked,freshContent:report.freshContent,
 checksumSha256:report.checksumSha256
},null,2));
if(results.length!==ids.length||results.some(x=>!x||!x.transport)){
 console.error('Incomplete smoke-report structure');
 process.exitCode=1;
}
