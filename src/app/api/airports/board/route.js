import {NextResponse} from 'next/server';
import {getAirportBoard} from '@/lib/flightOperations';
export const runtime='nodejs';
export async function GET(request){
 const p=new URL(request.url).searchParams;
 try{
  const data=await getAirportBoard(p.get('airport'),p.get('board'),p.get('destination'));
  const response=NextResponse.json(data,{status:data.success?200:data.status||502});
  response.headers.set('Cache-Control','public, s-maxage=120, stale-while-revalidate=60');
  return response;
 }catch(e){return NextResponse.json({success:false,error:'Flight status provider unavailable: '+e.message},{status:502});}
}
