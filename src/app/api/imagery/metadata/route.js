import {NextResponse} from 'next/server';

export const runtime='nodejs';
export const maxDuration=15;

const BASE='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/0/query';
const parseCoord=(value,min,max)=>{
 if(value===null||!/^[-+]?\d{1,3}(?:\.\d{1,6})?$/.test(value))return null;
 const n=Number(value);
 return Number.isFinite(n)&&n>=min&&n<=max?n:null;
};
function acquisitionDate(value){
 const raw=String(value??'');
 if(!/^(19|20)\d{6}$/.test(raw))return null;
 const year=Number(raw.slice(0,4)),month=Number(raw.slice(4,6)),day=Number(raw.slice(6,8));
 const d=new Date(Date.UTC(year,month-1,day));
 if(d.getUTCFullYear()!==year||d.getUTCMonth()+1!==month||d.getUTCDate()!==day||
  d.getTime()>Date.now()+86400000)return null;
 return d.toISOString().slice(0,10);
}
function safeLabel(v){return typeof v==='string'?v.slice(0,130):null;}
export async function GET(request){
 const p=new URL(request.url).searchParams;
 const lat=parseCoord(p.get('lat'),-85.0511,85.0511);
 const lon=parseCoord(p.get('lon'),-180,180);
 if(lat===null||lon===null)
  return NextResponse.json({success:false,error:'Valid WGS84 latitude and longitude are required'},
   {status:400,headers:{'Cache-Control':'no-store'}});
 const q=new URL(BASE);
 q.searchParams.set('f','json');
 q.searchParams.set('geometryType','esriGeometryPoint');
 q.searchParams.set('geometry',Number(lon.toFixed(4))+','+Number(lat.toFixed(4)));
 q.searchParams.set('inSR','4326');
 q.searchParams.set('spatialRel','esriSpatialRelIntersects');
 q.searchParams.set('outFields','SRC_DATE,SRC_RES,SRC_ACC,SRC_DESC,NICE_NAME,NICE_DESC,MinMapLevel,MaxMapLevel,DrawOrder,ReleaseName');
 q.searchParams.set('returnGeometry','false');
 q.searchParams.set('resultRecordCount','10');
 try{
  const response=await fetch(q,{next:{revalidate:3600},signal:AbortSignal.timeout(8500)});
  if(!response.ok)throw new Error('Esri imagery metadata HTTP '+response.status);
  const json=await response.json();
  if(json.error)throw new Error('Esri imagery metadata unavailable');
  const features=(Array.isArray(json.features)?json.features:[])
    .map(f=>f.attributes).filter(Boolean)
    .sort((a,b)=>(Number(b.MaxMapLevel)||0)-(Number(a.MaxMapLevel)||0)
      ||(Number(b.DrawOrder)||0)-(Number(a.DrawOrder)||0));
  const a=features[0]||null;
  const finite=v=>v!==null&&v!==undefined&&Number.isFinite(Number(v))&&Number(v)>=0&&Number(v)<99999?Number(v):null;
  const level=finite(a?.MaxMapLevel);
  const resolution=finite(a?.SRC_RES);
  const data={
   success:true,provider:'Esri World Imagery',lat,lon,
   available:!!a,
   acquiredOn:acquisitionDate(a?.SRC_DATE),
   sourceName:safeLabel(a?.NICE_NAME),sourceProvider:safeLabel(a?.NICE_DESC),
   sourceProduct:safeLabel(a?.SRC_DESC),
   sourceResolutionMeters:resolution,sourceAccuracyMeters:finite(a?.SRC_ACC),
   minimumSourceZoom:finite(a?.MinMapLevel),
   maximumSourceZoom:level===null?null:Math.min(23,Math.max(0,Math.round(level))),
   mapRelease:safeLabel(a?.ReleaseName),
   checkedAt:new Date().toISOString(),
   type:'Esri source metadata at the requested point; not live imagery',
   note:'Capture date is not the map publication date. Mosaic capture dates and native resolution change with location and map scale. Values are unavailable if the provider does not report them.',
   attribution:'Esri, Vantor, Earthstar Geographics, and the GIS User Community',
   reference:'https://support.esri.com/en-us/knowledge-base/how-to-view-the-world-imagery-basemap-metadata-in-arcgi-000018129',
  };
  const output=NextResponse.json(data);
  output.headers.set('Cache-Control','public, s-maxage=600, stale-while-revalidate=300');
  output.headers.set('X-Content-Type-Options','nosniff');
  return output;
 }catch(error){
  return NextResponse.json({success:false,provider:'Esri World Imagery',
   error:String(error?.message||'Imagery metadata could not be retrieved').slice(0,240),
   acquiredOn:null,available:false},
   {status:502,headers:{'Cache-Control':'no-store'}});
 }
}
