import {NextResponse} from 'next/server';
import {searchWorldwideLocations} from '@/lib/weatherService';
export const runtime='nodejs';
const error=(message,status)=>NextResponse.json({success:false,error:message,locations:[]},
 {status,headers:{'Cache-Control':'no-store'}});
export async function GET(request){
 const p=new URL(request.url).searchParams;
 const q=p.get('q')||'';
 const country=(p.get('country')||'').trim().toUpperCase();
 if(q.length<2||q.length>90)return error('Enter a location name of 2–90 characters',400);
 if(country&&!/^[A-Z]{2}$/.test(country))return error('Choose a two-letter country code',400);
 try{
  const data=await searchWorldwideLocations(q,{country,count:5});
  const response=NextResponse.json(data);
  response.headers.set('Cache-Control','public, s-maxage=600, stale-while-revalidate=600');
  response.headers.set('X-Content-Type-Options','nosniff');
  return response;
 }catch(e){return error('Geocoding unavailable: '+String(e.message||'provider error').slice(0,200),502);}
}
