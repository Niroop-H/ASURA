const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('src/lib/aiProvider.js','utf8');
let loadCount=0;
const load=()=>import('data:text/javascript;base64,'+Buffer.from(source).toString('base64')+'#'+(++loadCount));
function fakeGroq(ids,{chatStatus=200,chatAnswer='A road intersection is visible.'}={}){
 const calls=[];
 const fetcher=async(url,options={})=>{
  const address=String(url);
  if(address.endsWith('/models')){
   calls.push({kind:'models'});
   return {ok:true,status:200,json:async()=>({data:ids.map(id=>({id}))})};
  }
  assert.ok(address.endsWith('/chat/completions'));
  const body=JSON.parse(options.body);
  calls.push({kind:'completion',body});
  return {ok:chatStatus>=200&&chatStatus<300,status:chatStatus,
   headers:new Headers(),
   json:async()=>chatStatus===200?{
    model:body.model,choices:[{message:{content:chatAnswer,executed_tools:[]}}],
   }:{error:{message:'Requested vision model is not accessible'}}};
 };
 return {calls,fetcher};
}
async function scenario(ids,fn,policy='auto',config={}){
 const prevFetch=globalThis.fetch;
 const prevKey=process.env.GROQ_API_KEY;
 const prevPolicy=process.env.ASURA_VISION_POLICY;
 const mock=fakeGroq(ids,config);
 globalThis.fetch=mock.fetcher;
 process.env.GROQ_API_KEY='gsk_testing_123456789012345678901234';
 process.env.ASURA_VISION_POLICY=policy;
 try{const provider=await load();await fn(provider,mock.calls);}
 finally{
  globalThis.fetch=prevFetch;
  if(prevKey===undefined)delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY=prevKey;
  if(prevPolicy===undefined)delete process.env.ASURA_VISION_POLICY;
  else process.env.ASURA_VISION_POLICY=prevPolicy;
 }
}
const visionMessage=[
 {role:'system',content:'Explain only visible evidence.'},
 {role:'user',content:[
  {type:'text',text:'What is visible?'},
  {type:'image_url',image_url:{url:'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ=='}}
 ]}
];

test('auto selects Groq Qwen 3.8 multimodal when preview model is missing; text remains 120B',async()=>{
 await scenario(['openai/gpt-oss-120b','qwen/qwen3.8-27b'],async(mod,calls)=>{
  const h=await mod.groqHealth();
  assert.equal(h.ready,true);
  assert.equal(h.visionAvailable,true);
  assert.equal(h.visionFallbackActive,true);
  assert.equal(h.premiumVisionAvailable,false);
  assert.equal(h.visionModel,'qwen/qwen3.8-27b');
  const reply=await mod.callGroq({messages:visionMessage,vision:true,maxTokens:800});
  assert.equal(reply.success,true);
  assert.equal(reply.model,'qwen/qwen3.8-27b');
  assert.equal(reply.visionFallbackActive,true);
  assert.equal(reply.visionModelTier,'qwen-multimodal-27b');
  const call=calls.find(c=>c.kind==='completion');
  assert.equal(call.body.model,'qwen/qwen3.8-27b');
  assert.deepEqual(call.body.messages,visionMessage);
  assert.equal(call.body.reasoning_effort,'default');
  assert.equal(call.body.reasoning_format,'hidden');
  assert.ok(!call.body.tools);
 });
});

test('Muse preview is preferred when it is listed on the current account',async()=>{
 await scenario(['openai/gpt-oss-120b','qwen/qwen3.8-27b','meta-models/muse-spark-open'],async(mod,calls)=>{
  const h=await mod.groqHealth();
  assert.equal(h.visionModel,'meta-models/muse-spark-open');
  assert.equal(h.visionFallbackActive,false);
  const out=await mod.callGroq({messages:visionMessage,vision:true});
  assert.equal(out.success,true);
  assert.equal(out.visionModelTier,'muse-preview-816b');
  assert.equal(calls.find(c=>c.kind==='completion').body.model,'meta-models/muse-spark-open');
 });
});

test('strict preview-only policy refuses Qwen without silently opening a chat request',async()=>{
 await scenario(['openai/gpt-oss-120b','qwen/qwen3.8-27b'],async(mod,calls)=>{
  const h=await mod.groqHealth();
  assert.equal(h.visionAvailable,false);
  const out=await mod.callGroq({messages:visionMessage,vision:true});
  assert.equal(out.success,false);
  assert.match(out.error,/Preview-only/);
  assert.equal(out.diagnostics.stage,'model-availability');
  assert.ok(!calls.some(c=>c.kind==='completion'));
 },'preview-only');
});

test('a text-only key never pretends to have analyzed the image',async()=>{
 await scenario(['openai/gpt-oss-120b'],async(mod,calls)=>{
  const h=await mod.groqHealth();
  assert.equal(h.visionAvailable,false);
  const out=await mod.callGroq({messages:visionMessage,vision:true});
  assert.equal(out.success,false);
  assert.match(out.error,/No permitted image-capable Groq model/);
  assert.ok(!calls.some(c=>c.kind==='completion'));
 });
});

test('standard question remains GPT-OSS 120B with no vision substitution',async()=>{
 await scenario(['openai/gpt-oss-120b','qwen/qwen3.8-27b'],async(mod,calls)=>{
  const out=await mod.callGroq({messages:[{role:'user',content:'Explain databases.'}]});
  assert.equal(out.success,true);
  assert.equal(out.model,'openai/gpt-oss-120b');
  assert.equal(out.visionFallbackActive,undefined);
  assert.equal(calls.find(c=>c.kind==='completion').body.model,'openai/gpt-oss-120b');
 });
});

test('inference authorization failures do not turn into fake successful image descriptions',async()=>{
 await scenario(['openai/gpt-oss-120b','qwen/qwen3.8-27b'],async(mod,calls)=>{
  const out=await mod.callGroq({messages:visionMessage,vision:true});
  assert.equal(out.success,false);
  assert.match(out.error,/not accessible/);
  assert.equal(out.diagnostics.stage,'chat-completion');
  assert.equal(calls.filter(c=>c.kind==='completion').length,1);
 },'auto',{chatStatus:403});
});
