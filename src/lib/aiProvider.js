/**
 * ASURA Defense Intelligence System™ — model-verified Groq gateway.
 * Big-model only policy: 120B for text, 816B MoE (limited preview) for vision.
 * No 8B/20B/27B automatic downgrade. Secrets remain server-side.
 */
const ROOT='https://api.groq.com/openai/v1';
export const TEXT_MODEL='openai/gpt-oss-120b';
export const VISION_MODEL='meta-models/muse-spark-open';
let cached=null,modelExpiry=0;
const key=()=>String(process.env.GROQ_API_KEY||'').trim();
const cleanError=s=>String(s||'Unknown provider response')
 .replace(/gsk_[a-zA-Z0-9_-]+/g,'[redacted]')
 .replace(/Bearer\s+[^\s,]+/gi,'Bearer [redacted]').slice(0,260);
export async function availableModels(force=false){
 if(!key())return {ok:false,status:503,error:'GROQ_API_KEY is not configured in Vercel production'};
 if(cached&&Date.now()<modelExpiry&&!force)return cached;
 try{
  const r=await fetch(ROOT+'/models',{
   cache:'no-store',signal:AbortSignal.timeout(8000),
   headers:{Authorization:'Bearer '+key(),Accept:'application/json'},
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok)return {ok:false,status:r.status,
   error:'Groq model discovery HTTP '+r.status+': '+
    cleanError(data?.error?.message||(r.status===401?'Provider key rejected':'Model catalogue unavailable'))};
  const ids=Array.isArray(data.data)?data.data.map(x=>x.id).filter(x=>typeof x==='string'):[];
  if(!ids.length)return {ok:false,status:502,error:'Groq returned no available models'};
  cached={ok:true,ids,checkedAt:new Date().toISOString()};
  modelExpiry=Date.now()+300000;
  return cached;
 }catch(e){
  return {ok:false,status:503,error:'Groq model discovery failed: '+cleanError(e.message)};
 }
}
const chosenModel=(ids,vision)=>ids.includes(vision?VISION_MODEL:TEXT_MODEL)
 ?(vision?VISION_MODEL:TEXT_MODEL):null;
export async function callGroq({messages,vision=false,maxTokens=1700,
 webSearch=false,forceWebSearch=false}={}){
 const discovered=await availableModels();
 if(!discovered.ok)return {success:false,status:503,error:discovered.error,
  diagnostics:{provider:'Groq',stage:'model-discovery',providerStatus:discovered.status}};
 const model=chosenModel(discovered.ids,vision);
 if(!model)return {success:false,status:503,error:vision?
  'The 816B Muse Spark vision model requires Groq preview access; this key does not list an approved large vision model. No smaller vision model was substituted.':
  'The configured Groq key cannot access openai/gpt-oss-120b. No smaller text model will be substituted.',
  diagnostics:{provider:'Groq',stage:'model-availability',requiredModel:vision?VISION_MODEL:TEXT_MODEL}};
 const useSearch=Boolean(webSearch)&&!vision;
 const payload={
  model,messages,temperature:vision?0.2:0.35,
  max_completion_tokens:Math.min(3600,Math.max(500,Number(maxTokens)||1700)),
 };
 if(!vision){
  payload.reasoning_effort=useSearch?'low':'medium';
  if(useSearch){
   payload.tools=[{type:'browser_search'}];
   payload.tool_choice=forceWebSearch?'required':'auto';
  }
 }else{
  payload.reasoning_effort='low';
 }
 try{
  const r=await fetch(ROOT+'/chat/completions',{
   method:'POST',cache:'no-store',
   signal:AbortSignal.timeout(useSearch?47000:36000),
   headers:{Authorization:'Bearer '+key(),'Content-Type':'application/json'},
   body:JSON.stringify(payload),
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok){
   return {success:false,status:[400,401,403,404,422,429].includes(r.status)?503:502,
    error:'Large-model request rejected by Groq (HTTP '+r.status+'): '+
     cleanError(data?.error?.message||'No provider explanation')+
     (useSearch?' · Browser search was requested; no current answer was generated.':''),
    diagnostics:{provider:'Groq',stage:'chat-completion',attempted:[{model,status:r.status}],
      webSearchRequested:useSearch}};
  }
  const answer=data?.choices?.[0]?.message?.content;
  if(typeof answer!=='string'||!answer.trim())
   return {success:false,status:502,error:'Large model returned no usable answer',
    diagnostics:{provider:'Groq',stage:'chat-completion',attempted:[{model,status:502}]}};
  return {
   success:true,answer:answer.trim(),provider:'Groq',model:data.model||model,
   generatedAt:new Date().toISOString(),
   webSearchRequested:useSearch,webSearchRequired:useSearch&&Boolean(forceWebSearch),
   // Requesting a tool is not proof it was run; don't mark its results as verified
   // without provider evidence.
   webSearchExecuted:null,
   usage:data.usage?{inputTokens:data.usage.prompt_tokens??null,
    outputTokens:data.usage.completion_tokens??null}:null,
  };
 }catch(e){
  return {success:false,status:503,
   error:'Large-model inference did not complete: '+cleanError(e.message),
   diagnostics:{provider:'Groq',stage:'chat-completion',attempted:[{model,status:503}],
    webSearchRequested:useSearch}};
 }
}
export async function groqHealth(){
 const models=await availableModels();
 if(!models.ok)return {ready:false,configured:!!key(),provider:'Groq',
  error:models.error,checkedAt:new Date().toISOString(),
  requiredTextModel:TEXT_MODEL,requiredVisionModel:VISION_MODEL};
 const ready=Boolean(chosenModel(models.ids,false));
 const visionReady=Boolean(chosenModel(models.ids,true));
 return {ready,configured:true,provider:'Groq',model:ready?TEXT_MODEL:null,
  modelParametersBillion:ready?120:null,visionAvailable:visionReady,
  visionModel:visionReady?VISION_MODEL:null,
  requiredTextModel:TEXT_MODEL,requiredVisionModel:VISION_MODEL,
  webResearchSupported:ready,
  checkedAt:models.checkedAt,error:ready?'':'GPT-OSS 120B not accessible on this Groq key; smaller models disabled'};
}
