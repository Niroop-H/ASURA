import {getLiveSource} from '@/lib/liveFeeds';
import {getCaltransCatalog,getTflCatalog} from '@/lib/publicCameras';
import {searchAirports} from '@/lib/airports';
import {identifyAirport} from '@/lib/aviationVerification';

export const CONTEXT_SOURCES=['news','weather','flights','cameras','airports','earthquakes','events','search'];
const trimmed=(v,n=240)=>String(v||'').replace(/\s+/g,' ').slice(0,n);

const PLACES=[
 {label:'Bengaluru, India',lat:12.9716,lon:77.5946,terms:['bengaluru','bangalore']},
 {label:'London, United Kingdom',lat:51.5074,lon:-0.1278,terms:['london']},
 {label:'Singapore',lat:1.3521,lon:103.8198,terms:['singapore']},
 {label:'New York, USA',lat:40.7128,lon:-74.0060,terms:['new york','nyc']},
 {label:'Dubai, UAE',lat:25.2048,lon:55.2708,terms:['dubai']},
 {label:'Mumbai, India',lat:19.0760,lon:72.8777,terms:['mumbai','bombay']},
 {label:'New Delhi, India',lat:28.6139,lon:77.2090,terms:['new delhi','delhi']},
 {label:'Chennai, India',lat:13.0827,lon:80.2707,terms:['chennai']},
 {label:'Hyderabad, India',lat:17.3850,lon:78.4867,terms:['hyderabad']},
 {label:'Kolkata, India',lat:22.5726,lon:88.3639,terms:['kolkata','calcutta']},
 {label:'Paris, France',lat:48.8566,lon:2.3522,terms:['paris']},
 {label:'Tokyo, Japan',lat:35.6762,lon:139.6503,terms:['tokyo']},
];
const REGION_WEATHER={bengaluru:PLACES[0],london:PLACES[1],
 singapore:PLACES[2],newyork:PLACES[3],dubai:PLACES[4]};
async function weatherLocation(question,region){
 const q=question.toLowerCase();
 const known=PLACES.find(city=>city.terms.some(t=>new RegExp('\\b'+t+'\\b','i').test(q)));
 if(known)return known;
 const m=question.match(/\b(?:weather|temperature|forecast|rain|conditions?)\s+(?:today\s+|currently\s+|right\s+now\s+)?(?:in|at|near|for)\s+([a-zA-Z][a-zA-Z .-]{1,55})/i)
  ||question.match(/\b(?:in|at|near|for)\s+([a-zA-Z][a-zA-Z .-]{1,55})\s+(?:weather|forecast|temperature)\b/i);
 if(!m)return REGION_WEATHER[region]||REGION_WEATHER.bengaluru;
 const location=m[1].split(/\b(?:today|tomorrow|right now|currently|this|please|and|with|on|nearby)\b/i)[0].replace(/[?.!,]+$/,'').trim();
 if(!location)return REGION_WEATHER[region]||REGION_WEATHER.bengaluru;
 if(!process.env.OPENWEATHERMAP_API_KEY)throw new Error('Location "'+location+'" requires geocoding; no geocoding API key is connected');
 const endpoint=new URL('https://api.openweathermap.org/geo/1.0/direct');
 endpoint.searchParams.set('q',location.slice(0,50));
 endpoint.searchParams.set('limit','1');
 endpoint.searchParams.set('appid',process.env.OPENWEATHERMAP_API_KEY);
 const r=await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(8500)});
 if(!r.ok)throw new Error('Location lookup provider HTTP '+r.status);
 const results=await r.json();
 const city=results?.[0];
 if(!Number.isFinite(city?.lat)||!Number.isFinite(city?.lon))throw new Error('Location "'+location+'" could not be verified by geocoding provider');
 return {label:[city.name,city.state,city.country].filter(Boolean).join(', ').slice(0,90),
  lat:city.lat,lon:city.lon};
}

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
  source==='flights'&&Number.isFinite(record.distanceNm)?'Distance from search center: '+record.distanceNm+' NM':'',
  source==='flights'&&Number.isFinite(record.positionAgeSeconds)?'Position age at retrieval: '+record.positionAgeSeconds+' seconds':'',
  source==='flights'&&record.positionType?'Receiver position type: '+trimmed(record.positionType,30):'',
  Number.isFinite(record.altitudeFeet)?'Reported barometric altitude: '+record.altitudeFeet+' ft':'',
  Number.isFinite(record.speedKnots)?'Ground speed: '+record.speedKnots+' knots':'',
  Number.isFinite(record.temperatureC)?'Temperature: '+record.temperatureC+' °C':'',
  Number.isFinite(record.windKmh)?'Wind: '+Math.round(record.windKmh)+' km/h':'',
 ].filter(Boolean);
 return {id:source+':'+(index+1),source,provider:trimmed(provider,70),
  title:trimmed(record.title,200),description:trimmed([record.description,...fields].filter(Boolean).join(' · '),550),
  observedAt:record.observedAt||null,retrievedAt:retrievedAt||new Date().toISOString(),
  url:validUrl(record.url),lat:Number.isFinite(record.lat)?record.lat:null,
  lon:Number.isFinite(record.lon)?record.lon:null,
  distanceNm:Number.isFinite(record.distanceNm)?record.distanceNm:null,
  positionAgeSeconds:Number.isFinite(record.positionAgeSeconds)?record.positionAgeSeconds:null,
  dataCategory:source==='flights'?'observed-aircraft-position':source,
  operationVerified:false};
};
async function cameraRecords(question){
 const lower=question.toLowerCase(),india=/\b(india|indian|bengaluru|bangalore|delhi|mumbai|hyderabad|chennai|karnataka)\b/.test(lower);
 const london=/\b(london|united kingdom|uk|england|tfl)\b/.test(lower);
 const california=/\b(california|usa|united states|caltrans|san francisco|oakland|sacramento)\b/.test(lower);
 if(india&&!california&&!london)return {records:[],provider:'Public camera directories',
  note:'No authorized Indian public CCTV or live video provider is connected in ASURA. Do not infer any Windy Webcams coverage unless an authenticated Windy result was actually retrieved.'};
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
 const recognized=identifyAirport(question);
 const exact=question.match(/\b[A-Z]{3,4}\b/);
 const search=recognized?.icao||exact?.[0]||
  question.match(/(?:airport(?: in| near| at| called)?|from|to)\s+([A-Z][a-zA-Z ]{2,24})/i)?.[1]?.trim()||'';
 const q=search&&search.toLowerCase()!=='airport'?search:'';
 if(!q)return {records:[],provider:'OurAirports',
  note:'No airport code or name identified. ASURA did not substitute unrelated directory records.'};
 const data=await searchAirports({q,limit:30});
 const matching=recognized?data.airports.filter(a=>a.icao===recognized.icao||a.iata===recognized.iata):
  data.airports.slice(0,10);
 return {records:matching.slice(0,10).map((a,i)=>({
  id:'airports:'+(i+1),source:'airports',provider:'OurAirports worldwide public directory',
  title:a.name,description:[a.iata?'IATA '+a.iata:null,a.icao?'ICAO '+a.icao:null,
   a.city,a.country,a.scheduled?'Scheduled-service flag':'No scheduled-service flag'].filter(Boolean).join(' · '),
  observedAt:null,retrievedAt:data.retrievedAt,url:validUrl(a.home),lat:a.lat,lon:a.lon,
 })),provider:'OurAirports',totalCatalog:data.totalAirports,
 note:'Airport facility metadata is not a departures/arrivals board and cannot verify airport movements. Actual arrivals require licensed flight-operations data.'};
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
   const airport=source==='flights'?identifyAirport(question):null;
   const args=source==='flights'&&airport
    ?{lat:airport.lat,lon:airport.lon,radiusNm:20}
    :source==='flights'?{region}:
     source==='weather'?await weatherLocation(question,region):{};
   const data=await getLiveSource(source,args);
   if(!data?.success)throw new Error(data?.error||'Provider did not return records');
   return {source,success:true,provider:data.provider,records:(data.records||[]).slice(0,source==='flights'?12:10)
    .map((r,i)=>recordFrom(r,source,data.provider,data.retrievedAt,i)),
    note:data.coverage||data.attribution||null,retrievedAt:data.retrievedAt,
    providerTime:data.providerTime||null,observationType:data.observationType||null,
    radiusNm:data.radiusNm||null,sourceAgeLimitSeconds:data.sourceAgeLimitSeconds||null,
    providerCount:data.count};
  }catch(e){return {source,success:false,error:trimmed(e.message,200)};}
 });
 const responses=await Promise.all(tasks);
 return {records:responses.flatMap(r=>r.success?r.records:[]).slice(0,38),
  statuses:responses.map(({source,success,error,provider,note,providerCount,totalCatalog,
    providerTime,observationType,radiusNm,sourceAgeLimitSeconds})=>
   ({source,success,error:error||null,provider:provider||null,note:note||null,
    providerTime:providerTime||null,observationType:observationType||null,
    radiusNm:radiusNm||null,sourceAgeLimitSeconds:sourceAgeLimitSeconds||null,
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
