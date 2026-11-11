import {NextResponse} from 'next/server';
import {getCaltransCatalog} from '@/lib/publicCameras';

// Convenience selection for the six-view wall. Only operator-published HLS
// streams are accepted. A valid HLS playlist does not prove browser playback.
export const runtime='nodejs';
export const maxDuration=30;
const clean=value=>typeof value==='string'?value.slice(0,100).trim():'';
const same=(a,b)=>!b||String(a||'').toLowerCase()===String(b).toLowerCase();
const approved=url=>{
 try{
  const u=new URL(url);
  return u.protocol==='https:'&&u.hostname==='wzmedia.dot.ca.gov'&&u.pathname.endsWith('.m3u8');
 }catch{return false;}
};
async function checkPlaylist(camera){
 if(!approved(camera.videoUrl))return null;
 try{
  const response=await fetch(camera.videoUrl,{cache:'no-store',signal:AbortSignal.timeout(4500),
    headers:{Accept:'application/vnd.apple.mpegurl,application/x-mpegurl,text/plain'}});
  if(!response.ok)return null;
  const contentType=response.headers.get('content-type')||'';
  if(!/mpegurl|application\/octet-stream|text\/plain/i.test(contentType))return null;
  const text=await response.text();
  if(!text.trimStart().startsWith('#EXTM3U'))return null;
  return {...camera,verifiedAt:new Date().toISOString(),streamStatus:'HLS playlist accessible; playback not yet verified'};
 }catch{return null;}
}
export async function GET(request){
 const p=new URL(request.url).searchParams;
 const continent=clean(p.get('continent')),country=clean(p.get('country')).toUpperCase();
 const state=clean(p.get('state')),district=clean(p.get('district')),region=clean(p.get('region'));
 if((continent&&continent!=='North America')||(country&&country!=='US')||
   (state&&!same('California',state))){
  return NextResponse.json({success:true,count:0,cameras:[],provider:'Caltrans CWWP2',
   note:'No connected authorized HLS streaming-camera provider for this location. An APK or Windy screenshot API will not create a live video source.'});
 }
 try{
  const catalog=await getCaltransCatalog();
  const candidates=catalog.cameras.filter(c=>c.sourceType==='hls'&&
    same(c.district,district)&&same(c.region,region)&&approved(c.videoUrl));
  // Prefer a district with numerous publicly published HLS streams if the
  // user has not selected one. Results still retain their true locations.
  candidates.sort((a,b)=>{
   const ar=a.district==='Caltrans District 4'?0:1;
   const br=b.district==='Caltrans District 4'?0:1;
   return ar-br||a.title.localeCompare(b.title);
  });
  const cameras=[];
  for(let i=0;i<Math.min(candidates.length,48)&&cameras.length<6;i+=8){
   const verified=await Promise.all(candidates.slice(i,i+8).map(checkPlaylist));
   for(const item of verified){if(item&&cameras.length<6)cameras.push(item);}
  }
  const response=NextResponse.json({success:true,provider:'Caltrans CWWP2',
   checkedAt:new Date().toISOString(),candidates:candidates.length,count:cameras.length,cameras,
   note:'Playlists returned valid HLS metadata when checked; browser CORS, stream freshness and active video frames still need verification in each tile.'});
  response.headers.set('Cache-Control','public, s-maxage=45, stale-while-revalidate=30');
  return response;
 }catch(error){
  return NextResponse.json({success:false,error:'Public HLS directory check failed: '+error.message,cameras:[]},{status:502});
 }
}
