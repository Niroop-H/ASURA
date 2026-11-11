/**
 * Server-only Groq gateway for ASURA chat and bounded public-image review.
 * Never export API keys or raw upstream response headers to the browser.
 */
const ROOT='https://api.groq.com/openai/v1';
const TEXT_MODELS=['openai/gpt-oss-20b','llama-3.1-8b-instant','openai/gpt-oss-120b','llama-3.3-70b-versatile'];
const VISION_MODELS=['qwen/qwen3.8-27b','qwen/qwen3.6-27b','meta-llama/llama-4-scout-17b-16e-instruct'];
let cached=null;
let modelExpiry=0;
const cleanError=(s)=>String(s||'Unknown upstream response')
 .replace(/gsk_[a-zA-Z0-9_-]+/g,'[redacted]').slice(0,210);
const key=()=>String(process.env.GROQ_API_KEY||'').trim();
export async function availableModels(force=false){
 if(!key())return {ok:false,status:503,error:'GROQ_API_KEY is not configured in Vercel production'};
 if(cached&&Date.now()<modelExpiry&&!force)return cached;
 try{
  const r=await fetch(ROOT+'/models',{
   cache:'no-store',signal:AbortSignal.timeout(9000),
   headers:{Authorization:'Bearer '+key(),Accept:'application/json'},
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok){
   return {ok:false,status:r.status,
    error:'Groq model discovery HTTP '+r.status+': '+cleanError(data?.error?.message||
     (r.status===401?'API key was rejected':r.status===404?'Model endpoint unavailable':'Check Groq account access'))};
  }
  const ids=Array.isArray(data.data)?data.data.map(x=>x.id).filter(x=>typeof x==='string'):[];
  if(!ids.length)return {ok:false,status:502,error:'Groq returned no available model IDs'};
  const result={ok:true,ids,checkedAt:new Date().toISOString()};
  cached=result;modelExpiry=Date.now()+300000;
  return result;
 }catch(e){return {ok:false,status:503,error:'Groq model discovery failed: '+cleanError(e.message)};}
}
const candidates=(ids,vision)=>{
 const preferred=vision?process.env.GROQ_VISION_MODEL:process.env.GROQ_MODEL;
 const order=[preferred,...(vision?VISION_MODELS:TEXT_MODELS)].filter(Boolean);
 return [...new Set(order)].filter(id=>ids.includes(id)).slice(0,3);
};
export async function callGroq({messages,vision=false,maxTokens=850}={}){
 const models=await availableModels();
 if(!models.ok) return {success:false,status:503,error:models.error,diagnostics:{provider:'Groq',stage:'model-discovery',providerStatus:models.status}};
 const options=candidates(models.ids,vision);
 if(!options.length)return {success:false,status:503,
  error:vision?'No authorized multimodal vision model is accessible on this Groq key':
   'No supported text-chat model is accessible on this Groq key',
  diagnostics:{provider:'Groq',stage:'model-availability',availableModelCount:models.ids.length}};
 const failures=[];
 for(const model of options){
  try{
   const r=await fetch(ROOT+'/chat/completions',{
    method:'POST',cache:'no-store',signal:AbortSignal.timeout(26000),
    headers:{Authorization:'Bearer '+key(),'Content-Type':'application/json'},
    body:JSON.stringify({model,temperature:vision?.25:.45,max_completion_tokens:Math.min(1400,Math.max(120,maxTokens)),messages}),
   });
   const data=await r.json().catch(()=>({}));
   if(!r.ok){
    const msg=cleanError(data?.error?.message||'No explanation from provider');
    failures.push({model,status:r.status,detail:msg});
    // Restricted/unavailable model or unsupported capability: attempt another.
    if([400,403,404,422].includes(r.status))continue;
    break;
   }
   const answer=data?.choices?.[0]?.message?.content;
   if(typeof answer==='string'&&answer.trim())return {
    success:true,answer:answer.trim(),provider:'Groq',model:data.model||model,
    generatedAt:new Date().toISOString(),
   };
   failures.push({model,status:502,detail:'Provider returned empty assistant content'});
  }catch(e){failures.push({model,status:503,detail:cleanError(e.message)});break;}
 }
 return {success:false,status:502,
  error:'AI provider could not complete the response. '+failures.map(f=>f.model+' (HTTP '+f.status+': '+f.detail+')').join('; ').slice(0,460),
  diagnostics:{provider:'Groq',stage:'chat-completion',attempted:failures.map(f=>({model:f.model,status:f.status}))}};
}
export async function groqHealth(){
 const found=await availableModels();
 if(!found.ok)return {ready:false,configured:!!key(),provider:'Groq',error:found.error,checkedAt:new Date().toISOString()};
 const usable=candidates(found.ids,false);
 return {ready:usable.length>0,configured:true,provider:'Groq',model:usable[0]||null,
  visionAvailable:candidates(found.ids,true).length>0,checkedAt:found.checkedAt,
  error:usable.length?'': 'Configured Groq key has no supported chat model'};
}
