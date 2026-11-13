import {NextResponse} from 'next/server';
import {verifyDefenseRequest,sha256} from '@/lib/defenseSecurity';
import {logAuditEvent,verifyAuditChain} from '@/lib/auditLogger';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const NONCES=new Map(); // best-effort one-instance replay cache, not durable

export async function POST(request){
 const length=Number(request.headers.get('content-length')||0);
 if(length>16384)return NextResponse.json({success:false,error:'Too large'},{status:413});
 let raw;
 try{raw=await request.text();}catch{return NextResponse.json({success:false},{status:400})}
 if(raw.length>16384)return NextResponse.json({success:false},{status:413});
 let verified=false;
 try{
  verified=verifyDefenseRequest('POST','/api/defense/webhook',raw,request.headers,NONCES);
 }catch{verified=false}
 if(!verified)return NextResponse.json({success:false,error:'Signature rejected'},{status:401});
 let payload;
 try{payload=JSON.parse(raw);}catch{return NextResponse.json({success:false},{status:400})}
 if(payload?.origin!=='ASURA-DEFENSE-CORE'||typeof payload?.event?.type!=='string'||
    typeof payload?.event?.traceId!=='string'){
  return NextResponse.json({success:false,error:'Invalid event envelope'},{status:400});
 }
 const record=logAuditEvent({
  category:'DEFENSE_WEBHOOK',
  action:'SIGNED_'+payload.event.type.slice(0,45).toUpperCase(),
  actor:'RENDER_ENGINE',
  status:'RECEIVED',
  details:'eventSha256='+sha256(JSON.stringify(payload.event))+
   ';trace='+payload.event.traceId.slice(0,40),
  classification:'DEVELOPMENT_UNVERIFIED'
 });
 const proof=verifyAuditChain();
 return NextResponse.json({
  success:true,eventRecorded:true,recordHash:record.hash,
  localMerkleRoot:proof.merkleRoot,
  persistent:false,
 },{headers:{'Cache-Control':'no-store'}});
}
