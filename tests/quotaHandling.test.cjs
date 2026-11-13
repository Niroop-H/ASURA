const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const raw=fs.readFileSync('src/lib/aiProvider.js','utf8');
const load=()=>import('data:text/javascript;base64,'+Buffer.from(raw).toString('base64')+'#'+Date.now()+Math.random());
async function scenario(mock,fn){
 const beforeFetch=globalThis.fetch, beforeKey=process.env.GROQ_API_KEY;
 process.env.GROQ_API_KEY='gsk_TEST_ALLOWED_123456789';
 globalThis.fetch=mock;
 try{return await fn(await load());}
 finally{
  globalThis.fetch=beforeFetch;
  if(beforeKey===undefined)delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY=beforeKey;
 }
}
test('provider TPM 429 yields safe structured cooldown rather than raw organization or model details',async()=>{
 let completionCalls=0,seenPayload;
 await scenario(async(url,opts)=>{
  if(String(url).endsWith('/models'))
   return {ok:true,status:200,json:async()=>({data:[{id:'openai/gpt-oss-120b'}]})};
  completionCalls++;seenPayload=JSON.parse(opts.body);
  return {ok:false,status:429,headers:new Headers({'retry-after':'30'}),
   json:async()=>({error:{message:'Rate limit reached for model openai/gpt-oss-120b in organization org_TEST_SECRET; Used 7900, limit 8000'}})};
 },async provider=>{
  const args={messages:[{role:'user',content:'Summarize retrieved facts'}],maxTokens:2400};
  const out=await provider.callGroq(args);
  assert.equal(out.success,false);
  assert.equal(out.status,429);
  assert.equal(out.retryAfterSeconds,30);
  assert.equal(out.diagnostics.stage,'rate-limit');
  assert.equal(out.error.includes('org_TEST_SECRET'),false);
  assert.equal(out.error.includes('gpt-oss-120b'),false);
  assert.match(out.error,/Quantum\[-0-\]Brain D25@1007/);
  assert.equal(completionCalls,1);
  assert.ok(seenPayload.max_completion_tokens<=1600);
  const again=await provider.callGroq(args);
  assert.equal(again.status,429);
  assert.equal(completionCalls,1,'per-instance cooldown prevents duplicate calls');
 });
});
test('successful text inference keeps raw model for diagnostics while brand remains an application label',async()=>{
 let requests=0;
 await scenario(async(url,opts)=>{
  if(String(url).endsWith('/models'))return {ok:true,status:200,json:async()=>({data:[{id:'openai/gpt-oss-120b'}]})};
  requests++;
  return {ok:true,status:200,headers:new Headers(),json:async()=>({
   model:'openai/gpt-oss-120b',
   choices:[{message:{content:'Grounded provider result',executed_tools:[]}}]})};
 },async provider=>{
  assert.equal(provider.MODEL_BRAND,'Quantum[-0-]Brain D25@1007');
  const r=await provider.callGroq({messages:[{role:'user',content:'Hello'}],maxTokens:850});
  assert.equal(r.success,true);
  assert.equal(r.model,'openai/gpt-oss-120b');
  assert.equal(r.answer,'Grounded provider result');
  assert.equal(requests,1);
 });
});
