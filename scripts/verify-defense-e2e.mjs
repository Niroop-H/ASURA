#!/usr/bin/env node
/**
 * Authorized deployed smoke test: real Vercel -> Render -> Groq.
 * No attack tools, scans, containment or malware are invoked.
 * Does not report 50 external tools as installed.
 */
const token=process.env.ASURA_DEFENSE_ACCESS_TOKEN||'';
const render=process.env.RENDER_BACKEND_URL||'';
const vercel=process.env.ASURA_DEFENSE_URL||'';
if(token.length<32||!/^https:\/\/[a-z0-9.-]+\.onrender\.com\/?$/i.test(render)||
   !/^https:\/\/[a-z0-9.-]+\.vercel\.app\/?$/i.test(vercel)){
 console.error('Set private ASURA_DEFENSE_ACCESS_TOKEN, RENDER_BACKEND_URL and ASURA_DEFENSE_URL.');
 process.exit(2);
}
const headers={'X-ASURA-Operator-Token':token};
const health=await fetch(render.replace(/\/$/,'')+'/health',{cache:'no-store',signal:AbortSignal.timeout(15000)});
const body=await health.json();
if(!health.ok||body.status!=='ok'||body.engine!=='ASURA-DEFENSE-CORE'){
 console.error('FAIL: Render health contract');
 process.exit(1);
}
console.log('PASS Render /health');
const registry=await fetch(vercel.replace(/\/$/,'')+'/api/defense',{
 headers,cache:'no-store',signal:AbortSignal.timeout(20000),
});
const info=await registry.json();
if(!registry.ok||info.success!==true||info.tools?.length!==50||
   info.readiness?.connectedVerified!==0){
 console.error('FAIL: authenticated 50-tool registry/status contract');
 process.exit(1);
}
console.log('PASS authenticated Vercel -> Render /tools; 50 registry entries (not live installations)');
const directive='Inspect Wazuh and MISP Blue Team registry status via your approved functions. Explain unconnected providers. Do not scan, block, quarantine or execute payloads.';
const response=await fetch(vercel.replace(/\/$/,'')+'/api/defense',{
 method:'POST',cache:'no-store',
 headers:{...headers,'Content-Type':'application/json'},
 body:JSON.stringify({directive}),
 signal:AbortSignal.timeout(60000),
});
if(!response.ok||!response.body){
 console.error('FAIL: Vercel signed execution gateway '+response.status);
 process.exit(1);
}
const reader=response.body.getReader(),decoder=new TextDecoder();
let buffer='',events=[];
for(;;){
 const {done,value}=await reader.read();
 if(done)break;
 buffer+=decoder.decode(value,{stream:true}).replace(/\r\n/g,'\n');
 let index;
 while((index=buffer.indexOf('\n\n'))!==-1){
  const block=buffer.slice(0,index);buffer=buffer.slice(index+2);
  const line=block.split('\n').find(x=>x.startsWith('data: '));
  if(!line)continue;
  const event=JSON.parse(line.slice(6));
  events.push(event);
  if(events.length>100)throw Error('Too many events');
 }
}
const verified=events.filter(e=>e.ledger?.localVerified===true&&
 /^[a-f0-9]{64}$/.test(e.ledger.inProcessMerkleRoot||''));
const toolEvents=events.filter(e=>e.type==='tool');
const complete=events.find(e=>e.type==='complete');
if(!toolEvents.length||!complete||complete.status!=='COMPLETED'||
   verified.length!==events.length||events.some(e=>e.type==='error')){
 console.error('FAIL: Groq -> typed registry -> signed SSE -> Merkle verification incomplete');
 console.error(JSON.stringify({
  totalEvents:events.length,toolEvents:toolEvents.length,verified:verified.length,
  finalStatus:complete?.status||'missing',
  errors:events.filter(x=>x.type==='error').map(x=>x.status),
 },null,2));
 process.exit(1);
}
console.log(JSON.stringify({
 result:'PASS end-to-end developer smoke (NOT security accreditation)',
 renderHealth:true,registeredContracts:50,groqToolEvents:toolEvents.length,
 signedAuditEvents:verified.length,completed:complete.status,
 persistentAudit:false,liveProvidersVerified:0,
},null,2));
