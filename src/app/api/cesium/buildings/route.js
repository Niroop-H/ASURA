import {NextResponse} from 'next/server';
import {buildingQueryBounds,normalizeOsmBuildings} from '@/lib/osmBuildings';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=15;

// Public Overpass instances are community resources, NOT a production map
// tile backend. Only explicit user clicks should call this route. These
// process-local limits supplement caching; they are not globally distributed.
const IN_PROCESS_CACHE=new Map();
let lastFetch=0;
const CACHE_MS=6*60*60*1000;
const GLOBAL_COOLDOWN_MS=2500;
const CACHE_LIMIT=80;
const OVERPASS='https://overpass-api.de/api/interpreter';

function respond(data,status=200){
 return NextResponse.json(data,{
  status,headers:{
   'Cache-Control':'public, max-age=60, s-maxage=7200',
   'X-Content-Type-Options':'nosniff',
  },
 });
}
function reject(message,status){
 return respond({
  success:false,source:'OpenStreetMap / Overpass',
  error:message,
  note:'Public Overpass capacity is not guaranteed. A Cesium ion viewer token offers the full Cesium OSM Buildings tileset.',
 },status);
}
export async function GET(request){
 let bounds;
 try{
  const u=new URL(request.url);
  if(u.searchParams.size!==2||!u.searchParams.has('lat')||!u.searchParams.has('lon'))
   return reject('Specify only lat and lon of the current map center.',400);
  const lat=u.searchParams.get('lat'),lon=u.searchParams.get('lon');
  if(!/^-?\d{1,3}(?:\.\d{1,6})?$/.test(lat||'')||
     !/^-?\d{1,3}(?:\.\d{1,6})?$/.test(lon||''))
   return reject('Invalid geographic coordinates.',400);
  bounds=buildingQueryBounds(Number(lat),Number(lon));
 }catch{return reject('Invalid map position.',400)}
 const key=bounds.lat.toFixed(3)+','+bounds.lon.toFixed(3);
 const cached=IN_PROCESS_CACHE.get(key);
 const now=Date.now();
 if(cached&&now-cached.fetchedAt<CACHE_MS){
  return respond({...cached.data,fromCache:true});
 }
 if(now-lastFetch<GLOBAL_COOLDOWN_MS)
  return reject('Public OSM query cooldown active. Try again shortly, or enable Cesium ion.',429);
 if(IN_PROCESS_CACHE.size>=CACHE_LIMIT){
  const oldest=IN_PROCESS_CACHE.keys().next().value;
  IN_PROCESS_CACHE.delete(oldest);
 }
 lastFetch=now;
 const bbox=[bounds.south,bounds.west,bounds.north,bounds.east].join(',');
 const q='[out:json][timeout:8][maxsize:3000000];way["building"]('+bbox+');out geom 140;';
 try{
  const result=await fetch(OVERPASS+'?data='+encodeURIComponent(q),{
   headers:{Accept:'application/json','User-Agent':'ASURA-3D-Buildings-Research/1.0'},
   next:{revalidate:21600},
   signal:AbortSignal.timeout(9000),
  });
  if(!result.ok){
   return reject(
    result.status===429?'OpenStreetMap community server is rate-limiting requests.':
    'OpenStreetMap community query is temporarily unavailable (HTTP '+result.status+').',
    result.status===429?429:503
   );
  }
  const length=Number(result.headers.get('content-length')||0);
  if(length>1600000)return reject('Building query response exceeded safety limit.',503);
  const raw=await result.text();
  if(raw.length>1600000)return reject('Building query response exceeded safety limit.',503);
  const parsed=JSON.parse(raw);
  if(parsed.remark||!Array.isArray(parsed.elements))
   return reject('OpenStreetMap query timed out or did not return complete geometry.',503);
  const normalized=normalizeOsmBuildings(parsed,bounds);
  const data={
   success:true,
   mode:'openstreetmap-footprint-extrusions',
   source:'OpenStreetMap / Overpass',
   attribution:'© OpenStreetMap contributors (ODbL)',
   retrievedAt:new Date().toISOString(),
   center:{lat:bounds.lat,lon:bounds.lon},
   queryRadius:'About 200 metres from selected center',
   ...normalized,
   limitedTo:120,
   fromCache:false,
   warning:'Experimental 3D approximations of public OSM building outlines. Heights may be measured, estimated from levels, or illustrative (9 m). No photogrammetry, guaranteed coverage or surveyed accuracy.',
  };
  IN_PROCESS_CACHE.set(key,{data,fetchedAt:now});
  return respond(data);
 }catch{
  return reject('OpenStreetMap building footprints are temporarily unavailable. No invented buildings were substituted.',503);
 }
}
