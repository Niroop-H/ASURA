import {NextResponse} from 'next/server';
import {redTeamCatalogSummary} from '@/lib/redTeamCatalog';
import {RED_TEAM_ACTIONS,SAFETY_CONTRACT,
 runRedTeamReadOnlyAction,verifyRedTeamReference} from '@/lib/redTeamReadOnly';

export const runtime='nodejs';
export const maxDuration=15;

const reply=(payload,status=200)=>NextResponse.json(payload,{status,
 headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const lastChecks=new Map();
// Best-effort per-instance rate limit for upstream GitHub API consumption.
function allowMetadataCheck(req){
 const id=String(req.headers.get('x-real-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]||'anonymous').slice(0,64);
 const now=Date.now();
 if(lastChecks.size>300)for(const [k,v] of lastChecks)if(now-v.last>60000)lastChecks.delete(k);
 const entry=lastChecks.get(id)||{count:0,last:now};
 if(now-entry.last>=60000){entry.count=0;entry.last=now;}
 if(entry.count>=6)return false;
 entry.count++;
 lastChecks.set(id,entry);
 return true;
}
export async function GET(){
 return reply({
  success:true,
  ...redTeamCatalogSummary(),
  actions:RED_TEAM_ACTIONS,
  safety:SAFETY_CONTRACT,
  notice:'Catalogue references only. No third-party red-team tool is installed or executable in this application.'
 });
}
export async function POST(request){
 const length=Number(request.headers.get('content-length'));
 if(Number.isFinite(length)&&length>4096)
  return reply({success:false,error:'Command payload is too large.'},413);
 let body;
 try{body=await request.json();}
 catch{return reply({success:false,error:'Invalid JSON body.'},400)}
 if(!body||typeof body!=='object'||Array.isArray(body))
  return reply({success:false,error:'Command must be a JSON object.'},400);
 const action=typeof body.action==='string'?body.action:'';
 if(action==='verify-reference'){
  if(!allowMetadataCheck(request))
   return reply({success:false,error:'Too many GitHub reference checks. Try a later manual check.'},429);
  const out=await verifyRedTeamReference(body.repository);
  return reply(out,out.success?200:(out.status||502));
 }
 const out=runRedTeamReadOnlyAction({
  action,
  query:typeof body.query==='string'?body.query:'',
  category:typeof body.category==='string'?body.category:'all',
  scope:typeof body.scope==='string'?body.scope:''
 });
 return reply(out,out.success?200:400);
}
