import {NextResponse} from 'next/server';
import {getWorldwideWeather} from '@/lib/weatherService';
export const runtime='nodejs';
export const maxDuration=30;
const error=(message,status)=>NextResponse.json({success:false,error:message},
 {status,headers:{'Cache-Control':'no-store'}});
const coordinate=(v,min,max)=>{
 if(typeof v!=='string'||!/^[-+]?\d{1,3}(?:\.\d{1,6})?$/.test(v))return null;
 const x=Number(v);return Number.isFinite(x)&&x>=min&&x<=max?x:null;
};
export async function GET(request){
 const p=new URL(request.url).searchParams;
 const lat=coordinate(p.get('lat'),-90,90),lon=coordinate(p.get('lon'),-180,180);
 if(lat===null||lon===null)return error('Provide valid latitude and longitude. Country/state names alone are not weather coordinates.',400);
 const label=(p.get('label')||'').trim().slice(0,140);
 const state=(p.get('state')||'').trim().slice(0,90);
 const country=(p.get('country')||'').trim().slice(0,90);
 try{
  const data=await getWorldwideWeather(lat,lon,{label,state,country});
  const response=NextResponse.json(data);
  response.headers.set('Cache-Control','public, s-maxage=300, stale-while-revalidate=60');
  response.headers.set('X-Content-Type-Options','nosniff');
  return response;
 }catch(e){return error('Global weather unavailable: '+String(e.message||'provider error').slice(0,300),502);}
}
