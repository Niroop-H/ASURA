import {POST as agentPOST, GET as agentGET} from '../agent/route';

// Backward-compatible bridge. Legacy evidence-query consumers now use the
// same model-discovered, conversational ASURA agent instead of a hard-coded
// provider/model that can return HTTP 404.
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request){return agentGET(request);}
export async function POST(request){
 let body;
 try{body=await request.json();}
 catch{return Response.json({success:false,error:'Invalid JSON request'},{status:400});}
 const message=body?.message||body?.query;
 const normalized={
  message,history:body?.history||[],
  mode:body?.mode||(Array.isArray(body?.sources)?'live':'auto'),
  sources:body?.sources||[],region:body?.region||'bengaluru',
 };
 const forwarded=new Request(request.url,{
  method:'POST',headers:request.headers,
  body:JSON.stringify(normalized),
 });
 return agentPOST(forwarded);
}
