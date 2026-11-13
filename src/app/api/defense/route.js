import {NextResponse} from 'next/server';
import {
 renderEndpoint,requireDefenseOperator,signDefenseRequest,
 verifyDefenseSseEnvelope,sha256
} from '@/lib/defenseSecurity';
import {logAuditEvent,verifyAuditChain} from '@/lib/auditLogger';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;

function fail(error,status=503){
 return NextResponse.json({success:false,error,configured:status!==503},
  {status,headers:{'Cache-Control':'no-store'}});
}
function audit(action,actor,details,status='RECORDED'){
 const record=logAuditEvent({
  category:'AUTONOMOUS_DEFENSE',
  action,actor,status,details,
  classification:'DEVELOPMENT_UNVERIFIED',
 });
 return {recordHash:record.hash,...verifyAuditChain()};
}

export async function GET(request){
 const operator=requireDefenseOperator(request);
 if(!operator)return fail('Operator authentication is required',401);
 try{
  const endpoint=renderEndpoint('/tools');
  const r=await fetch(endpoint,{
   headers:{...signDefenseRequest('GET','/tools'),Accept:'application/json'},
   cache:'no-store',signal:AbortSignal.timeout(10000),
  });
  if(!r.ok)return fail('Render tool-status service returned HTTP '+r.status,502);
  const data=await r.json();
  if(!data||data.success!==true||!Array.isArray(data.tools)||data.tools.length!==50)
   return fail('Render tool registry failed schema validation',502);
  return NextResponse.json({...data,ledger:verifyAuditChain()},
   {headers:{'Cache-Control':'no-store'}});
 }catch{return fail('Render backend unavailable or misconfigured',503)}
}

export async function POST(request){
 const operator=requireDefenseOperator(request);
 if(!operator)return fail('Operator authentication is required',401);
 const length=Number(request.headers.get('content-length')||0);
 if(length>4096)return fail('Directive request too large',413);
 let data;
 try{data=await request.json()}catch{return fail('Invalid JSON request',400)}
 const directive=typeof data?.directive==='string'?data.directive.trim():'';
 if(directive.length<4||directive.length>900)return fail('Directive must be 4–900 characters',400);
 const promptHash=sha256(directive);
 const pre=audit('DIRECTIVE_RECEIVED',operator,'promptSha256='+promptHash+';stage=preflight');
 let url,body;
 try{
  url=renderEndpoint('/autonomous/execute');
  body=JSON.stringify({directive,operator});
 }catch{return fail('Render service or engine signing secret is not configured',503)}
 let upstream;
 try{
  upstream=await fetch(url,{
   method:'POST',
   headers:{
    'Content-Type':'application/json',
    Accept:'text/event-stream',
    ...signDefenseRequest('POST','/autonomous/execute',body),
   },
   body,cache:'no-store',
   signal:AbortSignal.timeout(55000),
  });
 }catch{
  audit('EXECUTE_CONNECT_FAILED',operator,'promptSha256='+promptHash,'UNAVAILABLE');
  return fail('Cannot reach the signed Render defence service',502);
 }
 if(!upstream.ok||!upstream.body){
  audit('EXECUTE_REJECTED',operator,'promptSha256='+promptHash+';http='+upstream.status,'REJECTED');
  return fail('Render rejected the signed execution request (HTTP '+upstream.status+')',502);
 }
 const encoder=new TextEncoder(),decoder=new TextDecoder(),reader=upstream.body.getReader();
 const stream=new ReadableStream({
  async start(controller){
   let buffer='',terminal=false,seen=0;
   const send=value=>controller.enqueue(encoder.encode('data: '+JSON.stringify(value)+'\n\n'));
   try{
    while(true){
     const {value,done}=await reader.read();
     if(done)break;
     buffer+=decoder.decode(value,{stream:true}).replace(/\r\n/g,'\n');
     if(buffer.length>131072)throw Error('Event buffer overflow');
     let index;
     while((index=buffer.indexOf('\n\n'))!==-1){
      const block=buffer.slice(0,index);
      buffer=buffer.slice(index+2);
      const line=block.split('\n').find(x=>x.startsWith('data: '));
      if(!line)continue;
      const envelope=JSON.parse(line.slice(6));
      const event=verifyDefenseSseEnvelope(envelope);
      if(!event)throw Error('Signed event rejected');
      if(++seen>100)throw Error('Event count limit');
      if(event.type==='complete')terminal=true;
      // No raw prompts, credentials, model chain-of-thought or raw source
      // events enter the in-memory audit ledger.
      const seal=audit(
       'ENGINE_'+String(event.type||'UNKNOWN').toUpperCase(),
       operator,
       'promptSha256='+promptHash+';type='+event.type+
        ';trace='+String(event.traceId||'').slice(0,40)+
        ';eventSha256='+sha256(JSON.stringify(event)),
       event.type==='error'?'UNAVAILABLE':'RECORDED'
      );
      send({...event,ledger:{
       localVerified:seal.valid,
       inProcessMerkleRoot:seal.merkleRoot,
       persistent:false,
       independentlyAnchored:false,
       recordHash:seal.recordHash,
      }});
     }
    }
    if(!terminal){
     audit('STREAM_INTERRUPTED',operator,'promptSha256='+promptHash,'INCOMPLETE');
     send({type:'error',status:'INCOMPLETE',summary:'Signed stream ended without completion; no operational success can be inferred.'});
    }
    audit('EXECUTION_STREAM_END',operator,'promptSha256='+promptHash+';events='+seen,
     terminal?'COMPLETE':'INCOMPLETE');
   }catch{
    audit('STREAM_VERIFICATION_FAILURE',operator,'promptSha256='+promptHash,'REJECTED');
    send({type:'error',status:'INTEGRITY_FAILURE',
     summary:'Signed Render event could not be verified or the connection failed. Findings are incomplete.'});
   }finally{
    try{await reader.cancel()}catch{}
    controller.close();
   }
  },
  cancel(){reader.cancel().catch(()=>{})},
 });
 return new Response(stream,{status:200,headers:{
  'Content-Type':'text/event-stream; charset=utf-8',
  'Cache-Control':'no-cache, no-transform',
  'X-Content-Type-Options':'nosniff','X-Accel-Buffering':'no',
 }});
}
