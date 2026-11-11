import {getLiveSource} from '@/lib/liveFeeds';
import {getCaltransCatalog,getTflCatalog} from '@/lib/publicCameras';
import {searchAirports} from '@/lib/airports';

export const CONTEXT_SOURCES=['news','weather','flights','cameras','airports','earthquakes','events','search'];
const trimmed=(v,n=240)=>String(v||'').replace(/\s+/g,' ').slice(0,n);
const validUrl=v=>{try{let u=new URL(v);return u.protocol==='https:'?u.href:null;}catch{return null;}};
const intent={
 news:/\b(news|headlines|breaking|reported|article|journalism|politics|latest updates)\b/i,
 weather:/\b(weather|temperature|humidity|rain|wind|climate|forecast)\b/i,
 flights:/\b(flights?|aircraft|airplanes?|airspace|ads-?b|aviation|takeoff|landing|airline)\b/i,
 cameras:/\b(camera|cameras|cctv|webcam|traffic cam|road footage|public feed|live stream)\b/i,
 airports:/\b(airport|airfield|aerodrome|runway|iata|icao)\b/i,
 earthquakes:/\b(earthquake|seismic|tremor|magnitude|aftershock)\b/i,
 events:/\b(wildfire|forest fire|volcano|volcanic|natural disaster|landslide|hurricane|floods?)\b/i,
 search:/\b(search the web|web search|look online|google search|browse the web)\b/i,
};
export function selectAgentSources(question,mode,sources){
 if(mode==='general')return [];
 if(mode==='live'){
  return [...new Set((sources||[]).filter(s=>CONTEXT_SOURCES.includes(s)))].slice(0,5);
 }
 const active=CONTEXT_SOURCES.filter(source=>intent[source]?.test(question));
 if(!active.length&&/\b(current events|what('s| is) happening|recent developments|latest news)\b/i.test(question))
  return ['news','events'];
 return active.slice(0,5);
}
const recordFrom=(record,source,provider,retrievedAt,index)=>{
 const fields=[
  record.registration?'Registration: '+trimmed(record.registration,40):'',
  record.aircraftType?'Aircraft type: '+trimmed(record.aircraftType,50):'',
  Number.isFinite(record.altitudeFeet)?'Altitude: '+record.altitudeFeet+' ft':'',
  Number.isFinite(record.speedKnots)?'Ground speed: '+record.speedKnots+' knots':'',
  Number.isFinite(record.temperatureC)?'Temperature: '+record.temperatureC+' °C':'',
  Number.isFinite(record.windKmh)?'Wind: '+Math.round(record.windKmh)+' km/h':'',
 ].filter(Boolean);
 return {id:source+':'+(index+1),source,provider:trimmed(provider,70),
  title:trimmed(record.title,200),description:trimmed([record.description,...fields].filter(Boolean).join(' · '),440),
  observedAt:record.observedAt||null,retrievedAt:retrievedAt||new Date().toISOString(),
  url:validUrl(record.url),lat:Number.isFinite(record.lat)?record.lat:null,
  lon:Number.isFinite(record.lon)?record.lon:null};
};
async function cameraRecords(question){
 const lower=question.toLowerCase(),india=/\b(india|indian|bengaluru|bangalore|delhi|mumbai|hyderabad|chennai|karnataka)\b/.test(lower);
 const london=/\b(london|united kingdom|uk|england|tfl)\b/.test(lower);
 const california=/\b(california|usa|united states|caltrans|san francisco|oakland|sacramento)\b/.test(lower);
 if(india&&!california&&!london)return {records:[],provider:'Public camera directories',
  note:'No authorized Indian live CCTV operator feed is connected. Windy Webcams (if configured) is a directory, not a continuous-video analysis source.'};
 const providers=california?['caltrans']:london?['tfl']:['caltrans','tfl'];
 const results=await Promise.allSettled(providers.map(async provider=>
  provider==='caltrans'?await getCaltransCatalog():await getTflCatalog()));
 const all=[];
 for(let i=0;i<results.length;i++){
  const r=results[i];
  if(r.status==='fulfilled')all.push(...r.value.cameras);
 }
 if(!all.length)throw new Error('No authorized public camera catalog responded');
 const keyword=question.match(/\b(?:TV\d{3}|T\d{3}[NSEW]?|[A-Z]{2}\d{2,3})\b/i)?.[0]?.toLowerCase();
 let matched=all;
 if(keyword){const arr=all.filter(c=>[c.id,c.title].some(v=>String(v).toLowerCase().includes(keyword)));if(arr.length)matched=arr;}
 return {records:matched.slice(0,10).map((c,i)=>({
  id:'cameras:'+(i+1),source:'cameras',provider:c.provider,title:c.title,
  description:trimmed([c.district,c.region,c.locality,
   c.sourceType==='hls'?'Operator lists an HLS stream; playback not verified':
   c.sourceType==='clip'?'Published MP4 clip, not continuous video':
   'Snapshot image, not continuous video'].filter(Boolean).join(' · '),310),
  retrievedAt:new Date().toISOString(),observedAt:null,url:validUrl(c.operatorUrl),
  cameraId:c.id,snapshotAvailable:Boolean(c.imageUrl),videoAvailable:c.sourceType==='hls',
  lat:c.lat,lon:c.lon,
 })),provider:'Caltrans / TfL public camera directories',note:
  'These are camera directory entries, not image analysis. Camera recording/capture times and live playback have not been independently verified.',
  totalCatalog:all.length};
}
async function airportRecords(question){
 const exact=question.match(/\b[A-Z]{3,4}\b/);
 const search=exact?.[0] || question.match(/(?:airport(?: in| near| at| called)?|from|to)\s+([A-Z][a-zA-Z ]{2,24})/i)?.[1]?.trim() || '';
 // Avoid dumping the full directory when asked an unspecific question.
 const q=search&&search.toLowerCase()!=='airport'?search:'';
 const data=await searchAirports({q,limit:10});
 return {records:data.airports.map((a,i)=>({
  id:'airports:'+(i+1),source:'airports',provider:'OurAirports worldwide public directory',
  title:a.name,description:[a.iata?'IATA '+a.iata:null,a.icao?'ICAO '+a.icao:null,
   a.city,a.country,a.scheduled?'Scheduled-service flag':'No scheduled-service flag'].filter(Boolean).join(' · '),
  observedAt:null,retrievedAt:data.retrievedAt,url:validUrl(a.home),lat:a.lat,lon:a.lon,
 })),provider:'OurAirports',totalCatalog:data.totalAirports,
 note:'Airport facility metadata is not an actual departures/arrivals board. Live flight status requires authorized flight operations data.'};
}
async function webRecords(question){
 if(!process.env.GOOGLE_SEARCH_API_KEY||!process.env.GOOGLE_SEARCH_ENGINE_ID)
  throw new Error('Google Programmable Search keys are not configured');
 const u=new URL('https://www.googleapis.com/customsearch/v1');
 u.searchParams.set('key',process.env.GOOGLE_SEARCH_API_KEY);
 u.searchParams.set('cx',process.env.GOOGLE_SEARCH_ENGINE_ID);
 u.searchParams.set('q',question.slice(0,160));u.searchParams.set('num','6');
 const r=await fetch(u,{signal:AbortSignal.timeout(9500),cache:'no-store'});
 if(!r.ok)throw new Error('Google Search returned HTTP '+r.status);
 const data=await r.json();
 return {records:(data.items||[]).slice(0,6).map((x,i)=>({
  id:'search:'+(i+1),source:'search',provider:'Google Programmable Search',title:trimmed(x.title,160),
  description:trimmed(x.snippet,450),observedAt:null,
  retrievedAt:new Date().toISOString(),url:validUrl(x.link),
 })),provider:'Google Programmable Search',note:'Web search indexes may be delayed; publication dates are not necessarily available.'};
}
export async function assembleAgentContext(question,sourceNames,{region='bengaluru'}={}){
 const sources=[...new Set(sourceNames.filter(s=>CONTEXT_SOURCES.includes(s)))].slice(0,5);
 const tasks=sources.map(async source=>{
  try{
   if(source==='cameras')return {source,success:true,...await cameraRecords(question)};
   if(source==='airports')return {source,success:true,...await airportRecords(question)};
   if(source==='search')return {source,success:true,...await webRecords(question)};
   const data=await getLiveSource(source,source==='flights'?{region}:{});
   if(!data?.success)throw new Error(data?.error||'Provider did not return records');
   return {source,success:true,provider:data.provider,records:(data.records||[]).slice(0,source==='flights'?12:10)
    .map((r,i)=>recordFrom(r,source,data.provider,data.retrievedAt,i)),
    note:data.coverage||data.attribution||null,retrievedAt:data.retrievedAt,
    providerCount:data.count};
  }catch(e){return {source,success:false,error:trimmed(e.message,200)};}
 });
 const responses=await Promise.all(tasks);
 return {records:responses.flatMap(r=>r.success?r.records:[]).slice(0,38),
  statuses:responses.map(({source,success,error,provider,note,providerCount,totalCatalog})=>
   ({source,success,error:error||null,provider:provider||null,note:note||null,
    providerCount:providerCount??totalCatalog??null})),
  checkedAt:new Date().toISOString()};
}
/** Explicit user-initiated public snapshot inspection, not continuous CCTV analysis. */
export async function loadPublicSnapshot(cameraId){
 if(typeof cameraId!=='string'||cameraId.length>140)return {success:false,error:'Invalid camera identifier'};
 const which=cameraId.startsWith('caltrans-')?'caltrans':cameraId.startsWith('tfl-')?'tfl':null;
 if(!which)return {success:false,error:'Only operator-published Caltrans and TfL snapshots are supported'};
 const catalog=which==='caltrans'?await getCaltransCatalog():await getTflCatalog();
 const camera=catalog.cameras.find(c=>c.id===cameraId);
 if(!camera||!camera.imageUrl)return {success:false,error:'No public snapshot is available for this camera'};
 const u=new URL(camera.imageUrl);
 const safe=(which==='caltrans'&&u.hostname==='cwwp2.dot.ca.gov')||
  (which==='tfl'&&u.hostname==='s3-eu-west-1.amazonaws.com'&&
   u.pathname.startsWith('/jamcams.tfl.gov.uk/'));
 if(u.protocol!=='https:'||!safe)return {success:false,error:'Camera snapshot host is not authorized'};
 const response=await fetch(u,{cache:'no-store',signal:AbortSignal.timeout(9500)});
 if(!response.ok)return {success:false,error:'Camera operator snapshot HTTP '+response.status};
 const mime=response.headers.get('content-type')||'';
 if(!/^image\/(jpeg|png)/i.test(mime))return {success:false,error:'Snapshot must be a JPEG or PNG image'};
 const contentLength=Number(response.headers.get('content-length')||0);
 if(contentLength>2600000)return {success:false,error:'Camera snapshot exceeds safe size limit'};
 const bytes=new Uint8Array(await response.arrayBuffer());
 if(bytes.length>2600000)return {success:false,error:'Camera snapshot exceeds safe size limit'};
 return {success:true,camera:{id:camera.id,title:camera.title,provider:camera.provider,
   imageUrl:camera.imageUrl,captureAt:null,checkedAt:new Date().toISOString()},
  dataUri:'data:'+(/png/i.test(mime)?'image/png':'image/jpeg')+';base64,'+Buffer.from(bytes).toString('base64')};
}
