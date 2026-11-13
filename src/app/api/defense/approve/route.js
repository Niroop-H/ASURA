import {NextResponse} from 'next/server';
import {
 renderEndpoint,requireDefenseOperator,signDefenseRequest,sha256
} from '@/lib/defenseSecurity';
import {logAuditEvent,verifyAuditChain} from '@/lib/auditLogger';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;

const json=(payload,status=200)=>NextResponse.json(payload,{
 status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},
});
function append(stage,operator,token,decision,outcome){
 const entry=logAuditEvent({
  category:'AUTONOMOUS_DEFENSE',action:stage,actor:operator,
  status:outcome||'RECORDED',classification:'DEVELOPMENT_UNVERIFIED',
  details:'approvalTokenSha256='+sha256(token)+';decision='+decision,
 });
 return {recordHash:entry.hash,...verifyAuditChain()};
}

export async function POST(request){
 const operator=requireDefenseOperator(request);
 if(!operator)return json({success:false,error:'Operator authentication required'},401);
 let data;
 try{
  if(Number(request.headers.get('content-length'))>8192)throw Error();
  data=await request.json();
 }catch{return json({success:false,error:'Invalid approval payload'},400)}
 const token=typeof data?.approvalToken==='string'?data.approvalToken:'';
 const decision=data?.decision;
 if(token.length<20||token.length>4096||!['approve','reject'].includes(decision))
  return json({success:false,error:'Approval token and explicit decision required'},400);
 const pre=append('APPROVAL_DECISION_RECEIVED',operator,token,decision);
 let url,body;
 try{
  url=renderEndpoint('/autonomous/approve');
  body=JSON.stringify({operator,approvalToken:token,decision});
 }catch{return json({success:false,error:'Render backend configuration unavailable'},503)}
 try{
  const r=await fetch(url,{
   method:'POST',body,cache:'no-store',
   headers:{
    'Content-Type':'application/json',
    ...signDefenseRequest('POST','/autonomous/approve',body),
   },
   signal:AbortSignal.timeout(12000),
  });
  const result=await r.json();
  const post=append('APPROVAL_OUTCOME',operator,token,decision,result.status||'UNKNOWN');
  return json({
   ...result,
   ledger:{before:{root:pre.merkleRoot,recordHash:pre.recordHash},
    after:{root:post.merkleRoot,recordHash:post.recordHash},
    verifiedInProcess:post.valid,persistent:false,externallyAnchored:false},
  },r.status);
 }catch{
  append('APPROVAL_BACKEND_UNAVAILABLE',operator,token,decision,'INCOMPLETE');
  return json({success:false,status:'UNAVAILABLE',error:'Signed approval could not be confirmed by Render; do not assume any action occurred.'},502);
 }
}
