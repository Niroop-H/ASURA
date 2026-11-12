/* ASURA no-secret public provider smoke probe.
 * Node 20+, source allowlist, no authentication keys, no operational certification.
 */
const fs=require('node:fs/promises');
const path=require('node:path');
const sources=[
 'faa_nas','faa_tfr','nws_alerts','fema_disasters','cisa_ics','nrc_events',
 'imf_portwatch','noaa_swpc_kp','federal_register','fcdo_travel',
 'gdacs_alerts','uscg_lnm','nasa_donki','treasury_debt'
];
async function main(){
 const raw=await fs.readFile(path.join(__dirname,'../src/lib/operationalFeeds.js'),'utf8');
 const {getOperationalSource}=await import(
  'data:text/javascript;base64,'+Buffer.from(raw).toString('base64'));
 const entries=[];
 for(let i=0;i<sources.length;i+=3){
  const batch=await Promise.all(sources.slice(i,i+3).map(async source=>{
   const r=await getOperationalSource(source,'',{healthProbe:true,timeoutMs:9000});
   return {source,success:r.success,checkedAt:r.checkedAt,status:r.status,
    recordCount:r.records.length,rawSha256:r.rawSha256||null,sha256:r.sha256||null,
    firstRecord:r.records[0]?{
     source:r.records[0].source,title:r.records[0].title,
     observedAt:r.records[0].observedAt,url:r.records[0].url}:null};
  }));
  entries.push(...batch);
 }
 const report={generatedAt:new Date().toISOString(),kind:'one-time-external-provider-smoke-check',
  checksNotCertification:true,sampleScope:'Explicit public sources; configured test geographies only',
  counts:{checked:entries.length,transportOk:entries.filter(x=>x.status.transport==='ok').length,
   down:entries.filter(x=>x.status.transport==='down').length,
   unknownOrStale:entries.filter(x=>x.status.content!=='fresh').length},
  sources:entries};
 await fs.mkdir(path.join(__dirname,'../artifacts'),{recursive:true});
 await fs.writeFile(path.join(__dirname,'../artifacts/public-source-smoke.json'),
  JSON.stringify(report,null,2)+'\n',{mode:0o600});
 console.log('ASURA PUBLIC PROVIDER SMOKE: '+JSON.stringify(report.counts));
 for(const x of entries)console.log(
  [x.source,x.status.transport,x.status.content,
   x.status.sourceCount??'-',x.status.reason].join(' | '));
 if(process.env.GITHUB_STEP_SUMMARY){
  const lines=['## ASURA public-source smoke','',
   'UTC: '+report.generatedAt,
   'One-time public endpoint check; NOT an operational certificate.','',
   '| Source | Transport | Content | Sampled records |','|---|---|---|---:|',
   ...entries.map(x=>'| '+x.source+' | '+x.status.transport+
    ' | '+x.status.content+' | '+x.recordCount+' |')];
  await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n');
 }
 if(report.counts.transportOk===0)process.exitCode=1;
}
main().catch(e=>{console.error('Smoke harness failed: '+String(e.message).slice(0,150));process.exitCode=1;});
