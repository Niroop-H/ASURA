/**
 * Public, operator-published travel cameras only.
 * Data are travel information; not a surveillance or person-identification service.
 * The only active unauthenticated adapter is Caltrans CWWP2.
 * Windy Webcams is available once WINDY_WEBCAMS_API_KEY is configured.
 */
const DISTRICTS = Array.from({length:12},(_,i)=>i+1);
const CONTINENTS = ['Africa','Antarctica','Asia','Europe','North America','Oceania','South America'];
const allowedImage = new Set(['cwwp2.dot.ca.gov']);
const allowedVideo = new Set(['wzmedia.dot.ca.gov','cwwp2.dot.ca.gov']);
const safeUrl=(raw,hosts)=>{
  try{const u=new URL(raw);return u.protocol==='https:'&&hosts.has(u.hostname.toLowerCase())?u.href:null;}
  catch{return null;}
};
const isCoord=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a)<=90&&Math.abs(b)<=180;
const safeText=(v,limit=140)=>String(v||'').slice(0,limit).trim();
async function caltransDistrict(d) {
  const n=String(d).padStart(2,'0');
  const url='https://cwwp2.dot.ca.gov/data/d'+d+'/cctv/cctvStatusD'+n+'.json';
  const response=await fetch(url,{next:{revalidate:300},signal:AbortSignal.timeout(10000),
    headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error('Caltrans district '+d+' HTTP '+response.status);
  const result=await response.json();
  if(!Array.isArray(result.data))throw new Error('Invalid Caltrans district '+d+' camera data');
  return result.data.map(row=>{
    const c=row?.cctv||{},geo=c.location||{},image=c.imageData?.static||{};
    const lat=Number(geo.latitude),lon=Number(geo.longitude);
    const snapshot=safeUrl(image.currentImageURL,allowedImage);
    const stream=safeUrl(c.imageData?.streamingVideoURL,allowedVideo);
    if(!isCoord(lat,lon)||(!snapshot&&!stream))return null;
    // Only clearly operator-published cameras in service. Does not prove signal is live.
    if(String(c.inService).toLowerCase()!=='true')return null;
    return {
      id:'caltrans-'+d+'-'+safeText(c.index||geo.locationName,75),
      provider:'Caltrans CWWP2',operator:'California Department of Transportation',
      title:safeText(geo.locationName||'Caltrans traffic camera',170),
      continent:'North America',country:'United States',countryCode:'US',
      state:'California',district:'Caltrans District '+d,
      region:safeText(geo.county||'County not provided',100),
      locality:safeText(geo.nearbyPlace||'',100),
      direction:safeText(geo.direction,50),route:safeText(geo.route,50),
      lat,lon,kind:'traffic',sourceType:stream?.includes('.m3u8')?'hls':'snapshot',
      imageUrl:snapshot,videoUrl:stream?.includes('.m3u8')?stream:null,
      operatorUrl:'https://dot.ca.gov/programs/traffic-operations/traveler-information/cwwp',
      recordAt:c.recordTimestamp?.recordDate&&c.recordTimestamp?.recordTime
        ?c.recordTimestamp.recordDate+' '+c.recordTimestamp.recordTime+' (provider local time)':null,
      imageUpdateFrequency: image.currentImageUpdateFrequency||null,
      note:'Source camera-in-service flag does not guarantee an image was captured recently. Snapshot time is unverified.',
    };
  }).filter(Boolean);
}
export async function getCaltransCatalog() {
  const all=await Promise.allSettled(DISTRICTS.map(caltransDistrict));
  const cameras=[],failed=[];
  for(let i=0;i<all.length;i++){
    if(all[i].status==='fulfilled')cameras.push(...all[i].value);
    else failed.push({district:DISTRICTS[i],error:String(all[i].reason?.message||'Source unavailable').slice(0,150)});
  }
  if(failed.length===12)throw new Error('All Caltrans district feeds unavailable');
  return {provider:'Caltrans CWWP2',cameras,failed,complete:failed.length===0};
}
/**
 * Official TfL JamCams: publicly distributed travel images and short MP4 clips.
 * MP4 files are clips updated by TfL, not continuous live video streams.
 */
export async function getTflCatalog(){
 const response=await fetch('https://api.tfl.gov.uk/Place/Type/JamCam',{
  next:{revalidate:180},signal:AbortSignal.timeout(13000),
  headers:{Accept:'application/json','User-Agent':'ASURA-PublicCameraExplorer/1.0'},
 });
 if(!response.ok)throw new Error('Transport for London JamCam HTTP '+response.status);
 const data=await response.json();
 if(!Array.isArray(data))throw new Error('Invalid TfL JamCam response');
 const cameras=data.map(cam=>{
  const p=Object.fromEntries((cam.additionalProperties||[]).map(x=>[x.key,x.value]));
  if(String(p.available).toLowerCase()!=='true')return null;
  const lat=Number(cam.lat),lon=Number(cam.lon);
  if(!isCoord(lat,lon))return null;
  const safeTflFile=(raw,extension)=>{
   try{
    const u=new URL(raw);
    if(u.protocol!=='https:'||u.hostname!=='s3-eu-west-1.amazonaws.com'||
      !u.pathname.startsWith('/jamcams.tfl.gov.uk/')||!u.pathname.toLowerCase().endsWith(extension))return null;
    return u.href;
   }catch{return null;}
  };
  const image=safeTflFile(p.imageUrl,'.jpg');
  const clip=safeTflFile(p.videoUrl,'.mp4');
  if(!image&&!clip)return null;
  return {
   id:'tfl-'+safeText(cam.id,90),title:safeText(cam.commonName||cam.id,170),
   provider:'TfL JamCams',operator:'Transport for London',
   continent:'Europe',country:'United Kingdom',countryCode:'GB',
   state:'England',district:null,region:'Greater London',locality:null,
   lat,lon,kind:'traffic',sourceType:clip?'clip':'snapshot',
   imageUrl:image,videoUrl:clip,playerUrl:null,
   operatorUrl:'https://tfl.gov.uk/traffic/status/',
   direction:safeText(p.view,80),
   recordAt:(cam.additionalProperties||[]).find(x=>x.key==='imageUrl')?.modified||null,
   imageUpdateFrequency:null,
   note:'TfL provides periodically refreshed images and short MP4 clips. The published clip is not continuous live video.',
  };
 }).filter(Boolean);
 return {provider:'TfL JamCams',cameras,complete:true,totalPublished:data.length};
}
function firstUrl(obj){
  if(typeof obj==='string')return obj;
  if(!obj||typeof obj!=='object')return null;
  for(const v of Object.values(obj)){
    const t=firstUrl(v);
    if(t&&/^https:\/\//.test(t))return t;
  }
  return null;
}
function normalizeWindy(w){
  const loc=w.location||{},lat=Number(loc.latitude),lon=Number(loc.longitude);
  if(!isCoord(lat,lon))return null;
  // Provider-supplied URLs only; no API keys are exposed in URLs.
  const url=firstUrl(w.urls?.detail)||firstUrl(w.urls)||null;
  const player=firstUrl(w.player?.day)||firstUrl(w.player?.live)||firstUrl(w.player)||null;
  const image=firstUrl(w.images?.current)||firstUrl(w.images)||null;
  const https=v=>{try{const u=new URL(v);return u.protocol==='https:'?u.href:null}catch{return null}};
  const imageUrl=https(image),operatorUrl=https(url),playerUrl=https(player);
  return {id:'windy-'+String(w.id),provider:'Windy Webcams',operator:'Webcam owner / Windy directory',
    title:safeText(w.title,170),continent:safeText(loc.continent)||null,
    country:safeText(loc.country)||null,countryCode:safeText(loc.country_code)||null,
    state:safeText(loc.region)||null,
    // Windy does not supply a district; never invent one.
    district:null,region:safeText(loc.city)||null,locality:safeText(loc.city)||null,
    lat,lon,kind:'public webcam',sourceType:'external-player',
    imageUrl,videoUrl:null,playerUrl,operatorUrl,
    status:safeText(w.status),recordAt:null,
    note:'Windy images may be previews or timelapses. Open the provider player for current camera status.',
  };
}
export async function getWindyCatalog({continent='',country='',state='',offset=0}={}) {
  if(!process.env.WINDY_WEBCAMS_API_KEY)return {connected:false,reason:'WINDY_WEBCAMS_API_KEY is not configured',cameras:[],total:0};
  if(offset>1000) return {connected:true,provider:'Windy Webcams',cameras:[],total:0,
    incomplete:true,note:'The Windy free API plan limits listing offsets to 1000.'};
  const url=new URL('https://api.windy.com/webcams/api/v3/webcams');
  url.searchParams.set('limit','50');
  url.searchParams.set('offset',String(Math.min(Math.max(0,offset),1000)));
  url.searchParams.set('include','location,images,player,urls');
  url.searchParams.set('lang','en');
  const cc={Africa:'AF',Antarctica:'AN',Asia:'AS',Europe:'EU','North America':'NA',Oceania:'OC','South America':'SA'};
  if(continent&&cc[continent])url.searchParams.set('continents',cc[continent]);
  if(country&&/^[A-Z]{2}$/.test(country))url.searchParams.set('countries',country);
  // Windy region codes differ from names. Region is filtered locally unless supplied as provider code.
  const response=await fetch(url,{next:{revalidate:180},signal:AbortSignal.timeout(12000),
    headers:{'x-windy-api-key':process.env.WINDY_WEBCAMS_API_KEY,Accept:'application/json'}});
  if(!response.ok)throw new Error('Windy Webcams HTTP '+response.status);
  const data=await response.json();
  if(!Array.isArray(data.webcams))throw new Error('Invalid Windy webcam response');
  const cameras=data.webcams.map(normalizeWindy).filter(Boolean);
  return {connected:true,provider:'Windy Webcams',cameras,total:Number(data.total)||cameras.length,
    incomplete:true,note:'A paginated Windy search; this page does not represent all webcams in the world.'};
}
function same(a,b){return !b||String(a||'').toLowerCase()===String(b).toLowerCase()}
function cameraFilter(camera,{continent='',country='',state='',district='',region='',q=''}){
  return same(camera.continent,continent)&&
    (!country||camera.countryCode===country||same(camera.country,country))&&
    same(camera.state,state)&&same(camera.district,district)&&same(camera.region,region)&&
    (!q||[camera.title,camera.locality,camera.route,camera.district,camera.region].some(v=>
      String(v||'').toLowerCase().includes(q.toLowerCase())));
}
export async function listCameras({continent='',country='',state='',district='',region='',q='',source='all',page=0}={}){
  const sources=[],all=[];
  if(source==='all'||source==='caltrans'){
    if(!country||country==='US'||country==='United States'){
      if(!continent||continent==='North America'){
        try{
          const caltrans=await getCaltransCatalog();
          all.push(...caltrans.cameras);
          sources.push({name:'Caltrans CWWP2',connected:true,count:caltrans.cameras.length,
            complete:caltrans.complete,failedDistricts:caltrans.failed.map(x=>x.district)});
        }catch(e){sources.push({name:'Caltrans CWWP2',connected:false,error:String(e.message)});}
      }
    } else sources.push({name:'Caltrans CWWP2',connected:true,notInCoverage:true,count:0});
  }
  if(source==='all'||source==='tfl'){
    if((!country||country==='GB'||country==='United Kingdom')&&(!continent||continent==='Europe')){
      try{
        const tfl=await getTflCatalog();
        all.push(...tfl.cameras);
        sources.push({name:'TfL JamCams',connected:true,count:tfl.cameras.length,complete:true});
      }catch(e){sources.push({name:'TfL JamCams',connected:false,error:String(e.message)});}
    }else sources.push({name:'TfL JamCams',connected:true,notInCoverage:true,count:0});
  }
  if(source==='all'||source==='windy'){
    try{
      const windy=await getWindyCatalog({continent,country,offset:page*50});
      all.push(...windy.cameras);
      sources.push({name:'Windy Webcams',connected:windy.connected,count:windy.cameras.length,
        reason:windy.reason,hasMore:windy.total>(page+1)*50,total:windy.total,
        sampleOnly:windy.connected});
    }catch(e){sources.push({name:'Windy Webcams',connected:false,error:String(e.message)});}
  }
  const filtered=all.filter(c=>cameraFilter(c,{continent,country,state,district,region,q}));
  filtered.sort((a,b)=>a.district?.localeCompare(b.district||'')||a.title.localeCompare(b.title));
  const unique=key=>[...new Set(all.filter(c=>cameraFilter(c,{
    continent,country,state:key==='state'?'':state,
    district:['state','district'].includes(key)?'':district,
    region:['state','district','region'].includes(key)?'':region,q:''
  })).map(c=>c[key]).filter(Boolean))].sort();
  const localPage=source==='windy'?filtered:filtered.slice(page*48,(page+1)*48);
  return {
    success:sources.some(x=>x.connected&&!x.notInCoverage),
    retrievedAt:new Date().toISOString(),totalMatches:source==='windy'?null:filtered.length,
    count:localPage.length,cameras:localPage,sourceStatuses:sources,
    page,hasMore:source==='windy'?sources.find(x=>x.name==='Windy Webcams')?.hasMore||false:
      filtered.length>(page+1)*48,
    options:{states:unique('state'),districts:unique('district'),regions:unique('region')},
    coverageNote:'Connected sources are not a worldwide CCTV inventory. State/district/region choices reflect provider metadata, not geographic completeness.',
  };
}
export {CONTINENTS};
