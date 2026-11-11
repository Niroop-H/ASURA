import {NextResponse} from 'next/server';
import {getFlightOperations,getFlightTrack} from '@/lib/flightOperations';
export const runtime='nodejs';
export async function GET(request){
 const p=new URL(request.url).searchParams;
 try{
  const result=p.get('track')==='true'
    ?await getFlightTrack(p.get('id'))
    :await getFlightOperations(p.get('id'));
  const response=NextResponse.json(result,{status:result.success?200:result.status||502});
  response.headers.set('Cache-Control','public, s-maxage=120, stale-while-revalidate=60');
  return response;
 }catch(e){return NextResponse.json({success:false,error:'Flight operations provider unavailable: '+e.message},{status:502});}
}
