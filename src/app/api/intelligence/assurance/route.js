import {NextResponse} from 'next/server';
import {OPERATIONAL_SOURCE_IDS,probeOperationalSources,operationalDefinitions} from '@/lib/operationalFeeds';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=35;
// Per-instance 45-second read-through cache only. Serverless replicas
// do not share this state; it is NOT persistent monitoring or uptime proof.
let cached=null,expiresAt=0,pending=null;
export async function GET(request){
 const url=new URL(request.url);
 const id=url.searchParams.get('source')||'all';
 if(id!=='all'&&!OPERATIONAL_SOURCE_IDS.includes(id))
  return NextResponse.json({success:false,error:'Unknown public source'},{
   status:400,headers:{'Cache-Control':'no-store'}});
 try{
  const now=Date.now();
  if(id==='all'&&cached&&now<expiresAt)
   return NextResponse.json({success:true,...cached,cache:'per-instance-45s'},{
    headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  if(id==='all'&&!pending)pending=probeOperationalSources().finally(()=>{pending=null});
  const report=await (id==='all'?pending:probeOperationalSources([id]));
  if(id==='all'){cached=report;expiresAt=Date.now()+45000}
  return NextResponse.json({
   success:true,product:'ASURA Defense Intelligence System™',
   evaluation:'CURRENT PUBLIC ENDPOINT PROBE ONLY — NOT OPERATIONALLY VALIDATED',
   definitions:operationalDefinitions(),...report,
   cache:id==='all'?'fresh-probe':'single-source-probe'
  },{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }catch(e){
  return NextResponse.json({success:false,
   error:'Operational source check could not complete',checkedAt:new Date().toISOString()
  },{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
