import {NextResponse} from 'next/server';
import {listCameras,CONTINENTS} from '@/lib/publicCameras';
export const runtime='nodejs';
export const maxDuration=30;
const text=(v,max=100)=>typeof v==='string'?v.trim().slice(0,max):'';
export async function GET(request){
 const p=new URL(request.url).searchParams;
 const source=text(p.get('source'),15)||'all';
 if(!['all','caltrans','tfl','windy'].includes(source))
  return NextResponse.json({success:false,error:'Invalid camera source'},{status:400});
 const continent=text(p.get('continent'),40);
 const country=text(p.get('country'),80).toUpperCase();
 const state=text(p.get('state'),100);
 const district=text(p.get('district'),100);
 const region=text(p.get('region'),100);
 const q=text(p.get('q'),90);
 const hlsOnly=p.get('stream')==='hls';
 const page=Math.max(0,Math.min(300,parseInt(p.get('page')||'0',10)||0));
 if(continent&&!CONTINENTS.includes(continent))
  return NextResponse.json({success:false,error:'Invalid continent'},{status:400});
 if(country&&!/^[A-Z]{2}$/.test(country))
  return NextResponse.json({success:false,error:'Choose a valid two-letter country code'},{status:400});
 try{
  const result=await listCameras({continent,country,state,district,region,q,source,page,hlsOnly});
  const response=NextResponse.json(result);
  response.headers.set('Cache-Control','public, s-maxage=90, stale-while-revalidate=30');
  response.headers.set('X-Content-Type-Options','nosniff');
  return response;
 }catch(e){
  return NextResponse.json({success:false,cameras:[],error:'Public camera directory unavailable: '+e.message},{status:502});
 }
}
