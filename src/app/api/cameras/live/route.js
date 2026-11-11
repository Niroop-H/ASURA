import {NextResponse} from 'next/server';
import {getCaltransCatalog} from '@/lib/publicCameras';

// Public-source validation, never a relay/proxy for private streams.
// An HLS media playlist is evidence of available fragments, not proof that
// the viewer is decoding video or of the precise camera exposure timestamp.
export const runtime='nodejs';
export const maxDuration=30;
const clean=value=>typeof value==='string'?value.slice(0,100).trim():'';
const same=(a,b)=>!b||String(a||'').toLowerCase()===String(b).toLowerCase();
const approved=url=>{
 try{
  const u=new URL(url);
  return u.protocol==='https:'&&u.hostname==='wzmedia.dot.ca.gov'&&
   !u.username&&!u.password&&u.pathname.endsWith('.m3u8');
 }catch{return false;}
};
const playlistRequest=async url=>{
 if(!approved(url))return null;
 const response=await fetch(url,{
  cache:'no-store',signal:AbortSignal.timeout(4000),
  headers:{Origin:'https://asura-topaz.vercel.app',
    Accept:'application/vnd.apple.mpegurl,application/x-mpegurl,text/plain'},
 });
 if(!response.ok)return null;
 const cors=response.headers.get('access-control-allow-origin');
 if(cors!=='*'&&cors!=='https://asura-topaz.vercel.app')return null;
 const contentType=response.headers.get('content-type')||'';
 if(!/mpegurl|application\/octet-stream|text\/plain/i.test(contentType))return null;
 const text=await response.text();
 if(text.length>250000||!text.trimStart().startsWith('#EXTM3U'))return null;
 return text;
};
const firstMediaVariant=(text,base)=>{
 const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 // Variant master playlist; select the lowest declared bitrate for wall stability.
 const choices=[];
 for(let i=0;i<lines.length;i++){
  if(!lines[i].startsWith('#EXT-X-STREAM-INF:'))continue;
  const next=lines.slice(i+1).find(line=>!line.startsWith('#'));
  if(!next)continue;
  try{
   const url=new URL(next,base).href;
   if(!approved(url))continue;
   const bw=Number(lines[i].match(/BANDWIDTH=(\d+)/)?.[1]||99999999);
   choices.push({url,bw});
  }catch{}
 }
 choices.sort((a,b)=>a.bw-b.bw);
 return choices[0]?.url||null;
};
async function checkPlaylist(camera){
 if(!approved(camera.videoUrl))return null;
 try{
  const master=await playlistRequest(camera.videoUrl);
  if(!master)return null;
  const variant=firstMediaVariant(master,camera.videoUrl);
  const media=variant?await playlistRequest(variant):master;
  if(!media||!media.includes('#EXTINF:')||media.includes('#EXT-X-ENDLIST'))return null;
  const paths=media.split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#'));
  if(paths.length<2)return null;
  // Confirm that the media playlist exposes plausible same-provider segments.
  for(const segment of paths.slice(-2)){
   const u=new URL(segment,variant||camera.videoUrl);
   if(u.protocol!=='https:'||u.hostname!=='wzmedia.dot.ca.gov')return null;
  }
  const dates=Array.from(media.matchAll(/#EXT-X-PROGRAM-DATE-TIME:([^\r\n]+)/g));
  const observed=dates.length?Date.parse(dates[dates.length-1][1]):NaN;
  const age=Number.isFinite(observed)?Math.round((Date.now()-observed)/1000):null;
  // When the operator includes a per-segment time, reject obviously stale feeds.
  if(age!==null&&(age>300||age < -120))return null;
  return {...camera,verifiedAt:new Date().toISOString(),
   mediaSequence:media.match(/#EXT-X-MEDIA-SEQUENCE:(\d+)/)?.[1]||null,
   segmentTime:age!==null?new Date(observed).toISOString():null,
   segmentAgeSeconds:age,streamStatus:'Active HLS media playlist (browser playback not yet confirmed)',
  };
 }catch{return null;}
}
export async function GET(request){
 const p=new URL(request.url).searchParams;
 const continent=clean(p.get('continent')),country=clean(p.get('country')).toUpperCase();
 const state=clean(p.get('state')),district=clean(p.get('district')),region=clean(p.get('region'));
 const source=clean(p.get('source'))||'all';
 const limit=Math.max(6,Math.min(18,parseInt(p.get('limit')||'12',10)||12));
 if((source!=='all'&&source!=='caltrans')||(continent&&continent!=='North America')||
  (country&&country!=='US')||(state&&!same('California',state))){
  return NextResponse.json({success:true,count:0,cameras:[],provider:'Caltrans CWWP2',
   note:'No authorized connected live HLS source in this selection. Country directories, snapshots and APKs do not provide continuous camera video.'});
 }
 try{
  const catalog=await getCaltransCatalog();
  const candidates=catalog.cameras.filter(c=>c.sourceType==='hls'&&
    same(c.district,district)&&same(c.region,region)&&approved(c.videoUrl));
  candidates.sort((a,b)=>{
   const ar=a.district==='Caltrans District 4'?0:1;
   const br=b.district==='Caltrans District 4'?0:1;
   return ar-br||a.title.localeCompare(b.title);
  });
  const cameras=[],seen=new Set();
  for(let i=0;i<Math.min(candidates.length,120)&&cameras.length<limit;i+=10){
   const checked=await Promise.all(candidates.slice(i,i+10).map(checkPlaylist));
   for(const camera of checked)if(camera&&!seen.has(camera.id)&&cameras.length<limit){
    seen.add(camera.id);cameras.push(camera);
   }
  }
  const response=NextResponse.json({success:true,provider:'Caltrans CWWP2',
   checkedAt:new Date().toISOString(),candidates:candidates.length,
   count:cameras.length,cameras,verifiedLevel:'HLS media playlist with fragments',
   note:'Active playlists selected; exact camera exposure latency and successful decoding must be verified by the browser. The wall has spare feeds for failures.'});
  response.headers.set('Cache-Control','public, s-maxage=20, stale-while-revalidate=15');
  return response;
 }catch(error){
  return NextResponse.json({success:false,error:'Public HLS directory check failed: '+error.message,cameras:[]},{status:502});
 }
}
