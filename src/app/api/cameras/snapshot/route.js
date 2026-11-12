import {NextResponse} from 'next/server';
import {loadPublicSnapshot} from '@/lib/agentContext';

export const runtime='nodejs';
export const maxDuration=20;

// Only operator-published camera snapshots already verified by ASURA's
// allowlisted camera catalog may be displayed through this endpoint.
export async function GET(request){
 const cameraId=new URL(request.url).searchParams.get('cameraId')||'';
 if(!/^(?:caltrans-|tfl-)[a-zA-Z0-9 _-]{1,110}$/.test(cameraId))
  return NextResponse.json({success:false,error:'Invalid public camera identifier'},
   {status:400,headers:{'Cache-Control':'no-store'}});
 try{
  const screenshot=await loadPublicSnapshot(cameraId);
  if(!screenshot?.success)return NextResponse.json({success:false,
   error:screenshot?.error||'Operator image not available'},
   {status:404,headers:{'Cache-Control':'no-store'}});
  const data=screenshot.dataUri||'';
  const png=data.startsWith('data:image/png;base64,');
  if(!png&&!data.startsWith('data:image/jpeg;base64,'))
   throw new Error('Unexpected snapshot image format');
  const bytes=Buffer.from(data.slice(data.indexOf(',')+1),'base64');
  if(!bytes.length||bytes.length>2600000)throw new Error('Invalid snapshot size');
  return new NextResponse(new Uint8Array(bytes),{status:200,headers:{
   'Content-Type':png?'image/png':'image/jpeg',
   'Cache-Control':'no-store, max-age=0',
   'X-Content-Type-Options':'nosniff',
   'Cross-Origin-Resource-Policy':'same-origin',
   'Content-Security-Policy':"default-src 'none'; sandbox"
  }});
 }catch(e){
  return NextResponse.json({success:false,error:'Public snapshot currently unavailable'},
   {status:502,headers:{'Cache-Control':'no-store'}});
 }
}
