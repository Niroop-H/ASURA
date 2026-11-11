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
  cache:'no-store',signal:AbortSignal.timeout(3000),
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
// A playlist can be reachable while its actual video fragments are forbidden
// or offline. Inspect a small amount of one real transport-stream fragment.
async function validateSegment(url){
 if(!url||typeof url!=='string')return false;
 const u=new URL(url);
 if(u.protocol!=='https:'||u.hostname!=='wzmedia.dot.ca.gov')return false;
 const response=await fetch(u,{
  method:'GET',cache:'no-store',signal:AbortSignal.timeout(2800),
  headers:{Origin:'https://asura-topaz.vercel.app',Accept:'video/mp2t,*/*'},
 });
 if(!response.ok)return false;
 const cors=response.headers.get('access-control-allow-origin');
 if(cors!=='*'&&cors!=='https://asura-topaz.vercel.app')return false;
 const type=response.headers.get('content-type')||'';
 if(!/video\/mp2t|application\/octet-stream/i.test(type))return false;
 if(!response.body)return false;
 const reader=response.body.getReader();
 try{
  const first=await reader.read();
  const bytes=first.value;
  return Boolean(bytes&&bytes.length>0&&
    (bytes[0]===0x47||(bytes.length>188&&bytes[188]===0x47)));
 }finally{try{await reader.cancel()}catch{}}
}
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
  // Confirm the video fragments themselves are accessible, not merely
  // metadata. Prefer a segment that should already be fully written.
  const possible=paths.slice(-3,-1).reverse().map(segment=>
   new URL(segment,variant||camera.videoUrl));
  if(!possible.length)return null;
  let verifiedSegment=false;
  for(const url of possible){
   if(url.protocol!=='https:'||url.hostname!=='wzmedia.dot.ca.gov')return null;
   try{if(await validateSegment(url.href)){verifiedSegment=true;break;}}
   catch{}
  }
  if(!verifiedSegment)return null;
  const dates=Array.from(media.matchAll(/#EXT-X-PROGRAM-DATE-TIME:([^\r\n]+)/g));
  const observed=dates.length?Date.parse(dates[dates.length-1][1]):NaN;
  const age=Number.isFinite(observed)?Math.round((Date.now()-observed)/1000):null;
  // When the operator includes a per-segment time, reject obviously stale feeds.
  if(age!==null&&(age>300||age < -120))return null;
  return {...camera,verifiedAt:new Date().toISOString(),
   mediaSequence:media.match(/#EXT-X-MEDIA-SEQUENCE:(\d+)/)?.[1]||null,
   segmentTime:age!==null?new Date(observed).toISOString():null,
   segmentAgeSeconds:age,segmentFetchVerified:true,
   streamStatus:'Active HLS media playlist and transport-stream segment accessible (browser decoding not yet verified)',
  };
 }catch{return null;}
}
export async function GET(request){
 const p=new URL(request.url).searchParams;
 const continent=clean(p.get('continent')),country=clean(p.get('country')).toUpperCase();
 const state=clean(p.get('state')),district=clean(p.get('district')),region=clean(p.get('region'));
 const source=clean(p.get('source'))||'all';
 // Validate at most 6 per invocation: checking 12 fragments serially can
 // exceed Vercel's 30-second function budget.
 const limit=Math.max(1,Math.min(6,parseInt(p.get('limit')||'6',10)||6));
 const start=Math.max(0,Math.min(300,parseInt(p.get('start')||'0',10)||0));
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
  const cameras=[],seen=new Set(),startedAt=Date.now();
  // Bounded batches prevent 504s on expensive operator video probes.
  for(let i=start;i<Math.min(candidates.length,start+24)&&cameras.length<limit;i+=8){
   if(Date.now()-startedAt>16500)break;
   const checked=await Promise.all(candidates.slice(i,i+8).map(checkPlaylist));
   for(const camera of checked)if(camera&&!seen.has(camera.id)&&cameras.length<limit){
    seen.add(camera.id);cameras.push(camera);
   }
  }
  const response=NextResponse.json({success:true,provider:'Caltrans CWWP2',
   checkedAt:new Date().toISOString(),candidates:candidates.length,
   count:cameras.length,cameras,start,verifiedLevel:'HLS media playlist with accessible video fragments',
   note:'Max six fragment-checked video sources per request to avoid backend timeouts; select another starting offset for spares. Browser decoding, camera exposure latency and uninterrupted availability remain unverified.'});
  response.headers.set('Cache-Control','public, s-maxage=20, stale-while-revalidate=15');
  return response;
 }catch(error){
  return NextResponse.json({success:false,error:'Public HLS directory check failed: '+error.message,cameras:[]},{status:502});
 }
}
