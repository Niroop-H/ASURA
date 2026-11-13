const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const dataUri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const sec=import(dataUri(fs.readFileSync('src/lib/defenseSecurity.js','utf8')));
const audit=import(dataUri(fs.readFileSync('src/lib/auditLogger.js','utf8')));

test('HMAC request signing covers method, path, timestamp, nonce and raw body hash',async()=>{
 const before=process.env.ASURA_ENGINE_SECRET;
 process.env.ASURA_ENGINE_SECRET='test-hmac-shared-secret-greater-than-32-bytes';
 try{
  const {signDefenseRequest,verifyDefenseRequest}=await sec;
  const body=JSON.stringify({directive:'Inspect the offline Wazuh export'});
  const signed=signDefenseRequest('POST','/autonomous/execute',body);
  const headers=new Headers(signed);
  const nonces=new Map();
  assert.equal(verifyDefenseRequest('POST','/autonomous/execute',body,headers,nonces),true);
  assert.equal(verifyDefenseRequest('POST','/autonomous/execute',body,headers,nonces),false,'nonces are one-time');
  assert.equal(verifyDefenseRequest('POST','/autonomous/execute',body+' ',headers,new Map()),false);
  assert.equal(verifyDefenseRequest('POST','/autonomous/approve',body,headers,new Map()),false);
  const oldHeaders=new Headers({...signed,'X-ASURA-Timestamp':String(Math.floor(Date.now()/1000)-400)});
  assert.equal(verifyDefenseRequest('POST','/autonomous/execute',body,oldHeaders,new Map()),false);
 }finally{
  if(before===undefined)delete process.env.ASURA_ENGINE_SECRET;
  else process.env.ASURA_ENGINE_SECRET=before;
 }
});
test('signed SSE event envelope rejects any tampering',async()=>{
 const before=process.env.ASURA_ENGINE_SECRET;
 process.env.ASURA_ENGINE_SECRET='test-hmac-shared-secret-greater-than-32-bytes';
 try{
  const {verifyDefenseSseEnvelope}=await sec;
  const body=JSON.stringify({type:'tool',traceId:'fixture01',status:'NOT_CONNECTED'});
  const hmac=crypto.createHmac('sha256',process.env.ASURA_ENGINE_SECRET)
   .update('sse\n'+body).digest('hex');
  assert.equal(verifyDefenseSseEnvelope({body,sig:hmac}).status,'NOT_CONNECTED');
  assert.equal(verifyDefenseSseEnvelope({body:body.replace('NOT_CONNECTED','CONNECTED'),sig:hmac}),null);
  assert.equal(verifyDefenseSseEnvelope({body,sig:'bad'}),null);
 }finally{
  if(before===undefined)delete process.env.ASURA_ENGINE_SECRET;
  else process.env.ASURA_ENGINE_SECRET=before;
 }
});
test('operator tokens must be configured, equal and not leaked into source output',async()=>{
 const {requireDefenseOperator}=await sec;
 const before=process.env.ASURA_DEFENSE_ACCESS_TOKEN;
 const token='test-defender-operator-secret-at-least-32-characters';
 process.env.ASURA_DEFENSE_ACCESS_TOKEN=token;
 try{
  const request={headers:new Headers({'X-ASURA-Operator-Token':token})};
  const id=requireDefenseOperator(request);
  assert.match(id,/^[a-f0-9]{48}$/);
  assert.equal(id.includes(token),false);
  assert.equal(requireDefenseOperator({headers:new Headers({'X-ASURA-Operator-Token':'incorrect'})}),null);
 }finally{
  if(before===undefined)delete process.env.ASURA_DEFENSE_ACCESS_TOKEN;
  else process.env.ASURA_DEFENSE_ACCESS_TOKEN=before;
 }
});
test('Render URL is pinned and cannot be attacker-controlled or use local metadata endpoints',async()=>{
 const {renderEndpoint}=await sec;
 const before=process.env.RENDER_BACKEND_URL;
 try{
  process.env.RENDER_BACKEND_URL='https://asura-defense-core.onrender.com';
  assert.equal(renderEndpoint('/tools'),'https://asura-defense-core.onrender.com/tools');
  process.env.RENDER_BACKEND_URL='http://169.254.169.254';
  assert.throws(()=>renderEndpoint('/tools'));
  process.env.RENDER_BACKEND_URL='https://example.com';
  assert.throws(()=>renderEndpoint('/tools'));
 }finally{
  if(before===undefined)delete process.env.RENDER_BACKEND_URL;
  else process.env.RENDER_BACKEND_URL=before;
 }
});
test('SHA-256 in-process audit chain and retained Merkle root verify and disclose nonpersistence',async()=>{
 const {logAuditEvent,verifyAuditChain,getAuditLogs,merkleRoot}=await audit;
 const first=logAuditEvent({category:'DEFENSE',action:'BEGIN',details:'promptSha256='+crypto.createHash('sha256').update('sample').digest('hex')});
 const second=logAuditEvent({category:'DEFENSE',action:'OBSERVE',details:'eventSha256=abc123'});
 const status=verifyAuditChain();
 assert.equal(status.valid,true);
 assert.equal(status.persistent,false);
 assert.equal(status.externallyAnchored,false);
 assert.equal(second.previousHash,first.hash);
 assert.match(status.merkleRoot,/^[a-f0-9]{64}$/);
 assert.equal(status.totalWritten,2);
 assert.equal(getAuditLogs(1)[0].id,second.id);
 assert.equal(merkleRoot([]),'0'.repeat(64));
 const modified=getAuditLogs(2);
 modified[0].details='malicious';
 assert.equal(verifyAuditChain().valid,true,'returned audit entries are copies');
});
test('all defense backend integration pieces exist and are wired without client key references',async()=>{
 const files=[
  'backend/main.py','backend/tool_registry.py','backend/autonomous_orchestrator.py',
  'backend/requirements.txt','backend/Dockerfile','render.yaml',
  'src/app/api/defense/route.js','src/app/api/defense/approve/route.js',
  'src/app/api/defense/webhook/route.js','src/app/defense/page.jsx'
 ];
 for(const file of files)assert.equal(fs.existsSync(file),true,file);
 const clientSource=fs.readFileSync('src/app/defense/page.jsx','utf8');
 assert.equal(clientSource.includes('process.env.ASURA_ENGINE_SECRET'),false);
 assert.equal(clientSource.includes('process.env.GROQ_API_KEY'),false);
 assert.ok(clientSource.includes('X-ASURA-Operator-Token'));
 assert.ok(clientSource.includes('PENDING')||clientSource.includes('approval'));
});
