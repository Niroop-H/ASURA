import {NextResponse} from 'next/server';
import {CONTINENTS} from '@/lib/publicCameras';
export const runtime='nodejs';
const fallback=[{code:'US',name:'United States',continents:['North America']}];
export async function GET(){
 let countries=fallback,source='Fallback country selection',error=null;
 try{
  const r=await fetch('https://restcountries.conventus.de/v3.1/all?fields=name,cca2,continents',{
    next:{revalidate:86400},signal:AbortSignal.timeout(8500)});
  if(!r.ok)throw new Error('Country reference HTTP '+r.status);
  const data=await r.json();
  if(!Array.isArray(data)||data.length<150)throw new Error('Incomplete country reference');
  countries=data.map(c=>({code:String(c.cca2||''),name:String(c.name?.common||''),
    continents:Array.isArray(c.continents)?c.continents:[]})).filter(c=>/^[A-Z]{2}$/.test(c.code)&&c.name);
  source='REST Countries v3.1 public community mirror';
 }catch(e){error=e.message;}
 const response=NextResponse.json({success:true,continents:CONTINENTS,
  countries:countries.sort((a,b)=>a.name.localeCompare(b.name)),
  source,error,retrievedAt:new Date().toISOString()});
 response.headers.set('Cache-Control','public, s-maxage=86400');
 return response;
}
