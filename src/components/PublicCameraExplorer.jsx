'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Camera,ExternalLink,MapPin,RefreshCcw,Video,Search,Layers,AlertTriangle} from 'lucide-react';
import CameraWall from './CameraWall';

const formatTime=value=>{
 if(!value)return 'Not supplied';
 const d=new Date(value);return Number.isNaN(d.getTime())?'Not supplied':d.toLocaleString();
};
const isCoord=r=>r&&Number.isFinite(r.lat)&&Number.isFinite(r.lon)&&
 Math.abs(r.lat)<=90&&Math.abs(r.lon)<=180;
const sourceLink=c=>c.operatorUrl||null;
const safeLink=v=>{try{return new URL(v).protocol==='https:'}catch{return false;}};

function loadLeaflet(){
 if(window.L)return Promise.resolve(window.L);
 if(window.__asuraCameraLeaflet)return window.__asuraCameraLeaflet;
 window.__asuraCameraLeaflet=new Promise((resolve,reject)=>{
  const css=document.createElement('link');css.rel='stylesheet';
  css.href='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
  css.integrity='sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
  css.crossOrigin='anonymous';document.head.appendChild(css);
  const script=document.createElement('script');
  script.src='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
  script.crossOrigin='anonymous';
  script.integrity='sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
  script.onload=()=>resolve(window.L);script.onerror=()=>reject(new Error('Leaflet mapping library unavailable'));
  document.head.appendChild(script);
 });
 return window.__asuraCameraLeaflet;
}
function CameraPinMap({cameras,onSelect,selectedId}){
 const ref=useRef(null),map=useRef(null),markers=useRef(null);
 const[err,setErr]=useState('');
 useEffect(()=>{
  let active=true;
  loadLeaflet().then(L=>{
   if(!active||!ref.current||map.current)return;
   const m=L.map(ref.current,{worldCopyJump:true}).setView([38,-120],5,{animate:false});
   map.current=m;
   L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:18,attribution:'© OpenStreetMap contributors'}).addTo(m);
   markers.current=L.layerGroup().addTo(m);
   requestAnimationFrame(()=>{if(active&&!m._removed)m.invalidateSize({pan:false,animate:false})});
  }).catch(e=>{if(active)setErr(e.message)});
  return()=>{active=false;try{map.current?.remove()}catch{}map.current=null;markers.current=null;};
 },[]);
 useEffect(()=>{
  const m=map.current,L=window.L,group=markers.current;
  if(!m||!L||!group)return;
  group.clearLayers();
  const pts=cameras.filter(isCoord).slice(0,100);
  for(const c of pts){
   const p=L.circleMarker([c.lat,c.lon],{
    radius:c.id===selectedId?9:6,weight:2,color:'#fff',
    fillOpacity:1,fillColor:c.videoUrl?'#0ea5e9':'#22c55e',
   }).addTo(group);
   const div=document.createElement('div');
   const strong=document.createElement('strong');strong.textContent=c.title;div.appendChild(strong);
   const location=document.createElement('p');
   location.textContent=[c.region,c.district,c.state,c.country].filter(Boolean).join(' · ');
   div.appendChild(location);p.bindPopup(div);
   p.on('click',()=>onSelect(c));
  }
  if(pts.length){
   const bounds=L.latLngBounds(pts.map(c=>[c.lat,c.lon]));
   if(bounds.isValid()){
    if(pts.length===1)m.setView([pts[0].lat,pts[0].lon],9,{animate:false});
    else m.fitBounds(bounds,{padding:[30,30],maxZoom:12,animate:false});
   }
  }
 },[cameras,selectedId,onSelect]);
 return <div className="space-y-2">
  {err&&<p className="text-xs text-amber-800">{err}</p>}
  <div ref={ref} className="rounded border bg-slate-900 w-full" style={{height:410}} aria-label="Map of public, provider-authorized cameras currently in search results"/>
  <p className="text-xs text-slate-500">Map pins represent the current results page only, not every camera worldwide. Blue pins have a stream URL; green pins have snapshots.</p>
 </div>;
}

function HlsVideo({url}){
 const video=useRef(null);
 const hls=useRef(null);
 const [state,setState]=useState('Connecting to the operator’s live HLS stream…');
 useEffect(()=>{
  let active=true,script=null;
  const v=video.current;
  if(!v||!safeLink(url)){setState('Invalid or missing operator stream URL');return;}
  const attach=()=>{
   if(!active||!v)return;
   if(v.canPlayType('application/vnd.apple.mpegurl')){
    v.src=url;
    setState('Live HLS source attached; press play to begin');
    return;
   }
   if(!window.Hls?.isSupported()){
    setState('This browser cannot play HLS. Use the operator’s stream link.');
    return;
   }
   const player=new window.Hls({enableWorker:true,lowLatencyMode:false});
   hls.current=player;
   player.loadSource(url);
   player.attachMedia(v);
   player.on(window.Hls.Events.MANIFEST_PARSED,()=>{
    if(active)setState('HLS playlist loaded — press play to view');
   });
   player.on(window.Hls.Events.ERROR,(_,data)=>{
    if(active&&data.fatal)setState('Operator stream unavailable: '+(data.details||'unknown playback error'));
   });
  };
  if(window.Hls)attach();
  else{
   script=document.createElement('script');
   script.src='https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';
   script.crossOrigin='anonymous';
   script.onload=attach;
   script.onerror=()=>{if(active)setState('HLS playback library unavailable')};
   document.head.appendChild(script);
  }
  return()=>{active=false;try{hls.current?.destroy()}catch{}hls.current=null;
   if(script)script.remove();
   if(v){v.pause();v.removeAttribute('src');v.load();}
  };
 },[url]);
 return <div className="space-y-2">
  <video ref={video} controls muted playsInline className="w-full rounded bg-slate-950" style={{aspectRatio:'16/9'}}/>
  <p role="status" className="text-xs text-slate-600">{state}</p>
 </div>;
}

function CameraDetail({camera,onAdd}){
 const [imageNonce,setImageNonce]=useState(0);
 const [imgError,setImgError]=useState(false);
 const [playVideo,setPlayVideo]=useState(false);
 useEffect(()=>{
  setImageNonce(0);setImgError(false);setPlayVideo(false);
  if(!camera?.imageUrl)return;
  const t=setInterval(()=>setImageNonce(n=>n+1),60000);
  return()=>clearInterval(t);
 },[camera?.id,camera?.imageUrl]);
 if(!camera)return <div className="defense-card p-5 text-sm text-slate-500">Select a public camera to inspect its available images and playback options.</div>;
 const thumbnail=camera.imageUrl
  ?camera.provider==='Windy Webcams'
    ?camera.imageUrl // Windy uses signed preview tokens; do not modify their URLs.
    :camera.imageUrl+(camera.imageUrl.includes('?')?'&':'?')+'asuraRefresh='+imageNonce
  :null;
 return <section className="defense-card p-5 space-y-4">
  <div className="flex flex-wrap justify-between gap-3 items-start">
   <div>
    <h3 className="font-semibold text-base">{camera.title}</h3>
    <p className="text-xs text-slate-600">{camera.provider} · {camera.operator}</p>
    <p className="text-xs text-slate-500">{[camera.continent,camera.country,camera.state,camera.district,camera.region,camera.locality].filter(Boolean).join(' / ')}</p>
   </div>
   <div className="flex flex-wrap gap-2 items-center">
    {camera.sourceType==='hls'&&<button type="button" onClick={()=>onAdd(camera)}
     className="rounded bg-sky-700 text-white px-3 py-2 text-xs font-medium">Add live stream to six-camera wall</button>}
    {camera.imageUrl&&['Caltrans CWWP2','TfL JamCams'].includes(camera.provider)&&
      <a href={'/agent?'+new URLSearchParams({camera:camera.id,cameraTitle:camera.title}).toString()}
       className="rounded border border-sky-300 text-sky-700 px-3 py-2 text-xs font-medium">
       Select snapshot — ask DEVASHRI your question
      </a>}
    {sourceLink(camera)&&<a href={sourceLink(camera)} target="_blank" rel="noopener noreferrer"
      className="text-xs text-sky-700 underline flex items-center gap-1">Original operator/provider <ExternalLink size={13}/></a>}
   </div>
  </div>
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
   <div className="space-y-2">
    <h4 className="text-sm font-semibold">Operator-published image</h4>
    {thumbnail&&!imgError?
      <img key={thumbnail} src={thumbnail} alt={'Public camera snapshot: '+camera.title}
        onError={()=>setImgError(true)} className="w-full object-contain bg-slate-950 rounded" style={{maxHeight:380}}/>
    :<div className="rounded bg-slate-100 p-8 text-sm text-slate-600">
     {thumbnail?'Snapshot unavailable from the public source.':'The operator has not supplied a public snapshot URL.'}
    </div>}
    <div className="flex flex-wrap items-center gap-2">
     {thumbnail&&<button type="button" onClick={()=>{setImgError(false);setImageNonce(n=>n+1)}}
       className="border px-3 py-2 rounded text-xs">Refresh image</button>}
     {camera.imageUrl&&<a href={camera.imageUrl} target="_blank" rel="noopener noreferrer"
       className="text-xs text-sky-700 underline">Open source image</a>}
    </div>
    <p className="text-xs text-slate-500">Images are re-requested approximately every minute while selected. Actual capture time has not been independently verified.</p>
   </div>
   <div className="space-y-2">
    <h4 className="text-sm font-semibold">Live stream / provider playback</h4>
    {camera.videoUrl&&safeLink(camera.videoUrl)?<>
      {camera.sourceType==='clip'?<>
        <video src={camera.videoUrl} controls playsInline preload="none" className="w-full rounded bg-slate-950" style={{aspectRatio:'16/9'}}/>
        <p className="text-xs text-slate-600">Operator-published MP4 clip: recorded footage periodically updated by TfL, not continuous live video. The clip may be delayed or temporarily unavailable.</p>
      </>:!playVideo?<button onClick={()=>setPlayVideo(true)}
        className="w-full rounded border border-sky-300 bg-sky-50 text-sky-800 p-6 text-sm font-medium">
        <Video className="mx-auto mb-2"/> Connect to official HLS stream
      </button>:<HlsVideo url={camera.videoUrl}/>}
      <a href={camera.videoUrl} target="_blank" rel="noopener noreferrer"
       className="text-xs text-sky-700 underline">Open operator video source</a>
    </>:camera.playerUrl&&safeLink(camera.playerUrl)?
      <a href={camera.playerUrl} target="_blank" rel="noopener noreferrer"
        className="inline-block px-4 py-3 border rounded text-sm text-sky-700 underline">Open licensed provider webcam player</a>
      :<p className="text-xs p-5 rounded bg-slate-100 text-slate-700">
        No publicly accessible video stream was provided for this camera. This is a snapshot feed only.
       </p>}
    <div className="text-xs text-slate-600 space-y-1">
     <p>Public source metadata record: {camera.recordAt||'Not supplied'}</p>
     <p>Publisher update-frequency field: {camera.imageUpdateFrequency||'Not supplied'}</p>
     <p>Coordinates: {isCoord(camera)?camera.lat.toFixed(5)+'°, '+camera.lon.toFixed(5)+'°':'Not supplied'}</p>
     <p>Type: {camera.kind} · {camera.route||camera.locality||'Location reference unavailable'}</p>
     <p>{camera.note}</p>
    </div>
   </div>
  </div>
 </section>;
}

const initial={continent:'North America',country:'US',state:'',district:'',region:'',source:'all',q:''};
export default function PublicCameraExplorer(){
 const [filters,setFilters]=useState(initial);
 const [geo,setGeo]=useState({continents:['Africa','Antarctica','Asia','Europe','North America','Oceania','South America'],
   countries:[{code:'US',name:'United States',continents:['North America']}]});
 const [records,setRecords]=useState({cameras:[],sourceStatuses:[],options:{states:[],districts:[],regions:[]},page:0,hasMore:false});
 const [page,setPage]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [selected,setSelected]=useState(null),[mapShown,setMapShown]=useState(false);
 const [refresh,setRefresh]=useState(0);
 const [liveOnly,setLiveOnly]=useState(false);
 const [wallSlots,setWallSlots]=useState(Array(6).fill(null));
 const [wallHydrated,setWallHydrated]=useState(false);
 const [selectedWallSlot,setSelectedWallSlot]=useState(null);
 const [autoLoading,setAutoLoading]=useState(false);
 const [autoError,setAutoError]=useState('');
 const sparePoolRef=useRef([]);
 const failedStreamsRef=useRef(new Set());
 const autoFillEpochRef=useRef(0);
 const [manualTitle,setManualTitle]=useState('');
 const [manualOperator,setManualOperator]=useState('');
 const [manualUrl,setManualUrl]=useState('');
 const [manualAuthorized,setManualAuthorized]=useState(false);
 const [manualError,setManualError]=useState('');
 // Persist only public Caltrans HLS wall selection URLs, never operator keys or
 // private manually supplied URLs. Another ASURA monitor tab can restore them.
 useEffect(()=>{
  try{
   const raw=localStorage.getItem('asura_public_camera_wall_v1');
   const parsed=raw?JSON.parse(raw):[];
   if(Array.isArray(parsed)&&parsed.length){
    const slots=Array(6).fill(null);
    for(let i=0;i<Math.min(6,parsed.length);i++){
     const cam=parsed[i];
     if(!cam||cam.provider!=='Caltrans CWWP2'||cam.sourceType!=='hls')continue;
     try{
      const url=new URL(cam.videoUrl);
      if(url.protocol==='https:'&&url.hostname==='wzmedia.dot.ca.gov'&&
       url.pathname.endsWith('.m3u8')&&!url.username&&!url.password&&
       typeof cam.id==='string'&&cam.id.startsWith('caltrans-')){
       slots[i]={id:cam.id,title:String(cam.title||'Public camera').slice(0,130),
        provider:'Caltrans CWWP2',sourceType:'hls',videoUrl:url.href,
        autoAssigned:cam.autoAssigned===true};
      }
     }catch{}
    }
    setWallSlots(slots);
   }
  }catch{}
  setWallHydrated(true);
  if(new URLSearchParams(window.location.search).get('wall')==='1'){
   requestAnimationFrame(()=>document.querySelector('[aria-label="Six-camera monitoring wall"]')?.
    scrollIntoView({behavior:'smooth',block:'start'}));
  }
 },[]);
 useEffect(()=>{
  if(!wallHydrated)return;
  try{
   const list=wallSlots.map(c=>c?.provider==='Caltrans CWWP2'?{
    id:c.id,title:c.title,sourceType:c.sourceType,provider:c.provider,
    videoUrl:c.videoUrl,autoAssigned:c.autoAssigned===true}:null);
   if(list.every(v=>v===null))localStorage.removeItem('asura_public_camera_wall_v1');
   else localStorage.setItem('asura_public_camera_wall_v1',JSON.stringify(list));
  }catch{}
 },[wallHydrated,wallSlots]);
 // Refresh signed Windy image URLs before their short free-tier expiration.
 useEffect(()=>{
  const timer=setInterval(()=>setRefresh(x=>x+1),8*60*1000);
  return()=>clearInterval(timer);
 },[]);
 useEffect(()=>{
  let alive=true;
  fetch('/api/cameras/geography').then(r=>r.json()).then(d=>{if(alive&&d.success)setGeo(d)}).catch(()=>{});
  return()=>{alive=false};
 },[]);
 const params=useMemo(()=>{
  const p=new URLSearchParams({page:String(page),source:filters.source});
  if(liveOnly)p.set('stream','hls');
  for(const key of ['continent','country','state','district','region','q']){
   if(filters[key])p.set(key,filters[key]);
  }
  return p.toString();
 },[page,filters,liveOnly]);
 useEffect(()=>{
  let alive=true;const controller=new AbortController();
  setLoading(true);setError('');
  const timer=setTimeout(async()=>{
   try{
    const response=await fetch('/api/cameras?'+params,{signal:controller.signal,cache:'no-store'});
    const data=await response.json();
    if(!alive)return;
    setRecords(data);
    if(response.status>=400)setError(data.error||'Camera directory failed to load');
    else if(!data.success)setError('No connected camera source covers this selection. Select Caltrans coverage or connect Windy Webcams.');
    else setError('');
    setSelected(prev=>data.cameras?.find(c=>c.id===prev?.id)||null);
   }catch(e){if(alive&&e.name!=='AbortError')setError(e.message);}
   finally{if(alive)setLoading(false);}
  },filters.q?320:0);
  return()=>{alive=false;controller.abort();clearTimeout(timer);};
 },[params,refresh]);
 const choose=(key,value)=>{
  setPage(0);setSelected(null);
  setFilters(prev=>{
   const next={...prev,[key]:value};
   if(key==='continent'){next.country='';next.state='';next.district='';next.region='';}
   if(key==='country'){next.state='';next.district='';next.region='';}
   if(key==='state'){next.district='';next.region='';}
   if(key==='district'){next.region='';}
   if(key==='source'){next.state='';next.district='';next.region='';}
   return next;
  });
 };
 const countries=geo.countries.filter(c=>!filters.continent||c.continents.includes(filters.continent));
 const options=records.options||{};
 const cameras=records.cameras||[];
 const statuses=records.sourceStatuses||[];
 const windyConfigured=statuses.some(s=>s.name==='Windy Webcams'&&s.connected);
 const caltransStatus=statuses.find(s=>s.name==='Caltrans CWWP2');
 const assignToWall=(camera)=>{
  if(camera?.sourceType!=='hls'||!camera.videoUrl){
    setAutoError('Only authorized, continuous HLS video can be placed on the live camera wall. This record is a snapshot or clip.');
    return;
  }
  setAutoError('');
  const duplicate=wallSlots.findIndex(c=>c?.id===camera.id);
  if(duplicate>=0){setSelectedWallSlot(duplicate);return;}
  let target=selectedWallSlot===null?wallSlots.findIndex(c=>!c):selectedWallSlot;
  if(target<0)target=0;
  setWallSlots(prev=>prev.map((item,i)=>i===target?camera:item));
  // Manual selections are never rotated out automatically.
  setSelectedWallSlot(null);
 };
 const addOperatorStream=event=>{
  event.preventDefault();
  setManualError('');
  if(!manualAuthorized){setManualError('Confirm public display permission from the camera operator.');return;}
  try{
   const url=new URL(manualUrl.trim());
   const host=url.hostname.toLowerCase();
   const privateName=host==='localhost'||host.endsWith('.local')||host.endsWith('.internal')||
     host.endsWith('.localhost')||/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
   if(url.protocol!=='https:'||url.username||url.password||privateName||
      !host.includes('.')||!url.pathname.toLowerCase().endsWith('.m3u8')){
     throw new Error('Enter a public HTTPS HLS playlist (.m3u8), not a private camera address, RTSP feed or APK.');
   }
   if(!manualTitle.trim()||!manualOperator.trim())throw new Error('Enter a camera title and the publishing operator.');
   if(/[?&](password|access_token|api_key|apikey|secret)=/i.test(url.search))
     throw new Error('Do not paste passwords or private API tokens into an embedded playback URL.');
   assignToWall({
    id:'manual-'+url.href,title:manualTitle.trim().slice(0,100),
    provider:'Operator-supplied HLS (unverified)',operator:manualOperator.trim().slice(0,100),
    sourceType:'hls',videoUrl:url.href,imageUrl:null,
    note:'Supplied by the operator; access, freshness and public display permissions are not verified by ASURA.',
   });
   setManualUrl('');setManualTitle('');setManualOperator('');setManualAuthorized(false);
  }catch(e){setManualError(e.message||'Stream URL rejected');}
 };
 const replaceFailedStream=(slot,camera)=>{
  if(!camera?.autoAssigned)return; // Never silently replace a user-supplied stream.
  if(wallSlots[slot]?.id!==camera.id)return;
  failedStreamsRef.current.add(camera.id);
  const used=new Set(wallSlots.filter(Boolean).map(c=>c.id));
  const replacement=sparePoolRef.current.find(c=>!used.has(c.id)&&!failedStreamsRef.current.has(c.id));
  if(!replacement){
   setAutoError('A selected HLS feed cannot decode or has stopped. No verified spare remains in this batch; use "Fill with 6 available live streams" to test fresh sources, or reconnect this tile.');
   return;
  }
  setWallSlots(previous=>previous.map((item,i)=>i===slot&&item?.id===camera.id?replacement:item));
  setAutoError('Camera '+(slot+1)+' was unavailable and has been switched to a different operator-published HLS playlist. Browser playback is being rechecked.');
 };
 const autoFillWall=async()=>{
  setAutoLoading(true);setAutoError('');
  try{
   const qs=new URLSearchParams();
   for(const key of ['continent','country','state','district','region','source']){
    if(filters[key])qs.set(key,filters[key]);
   }
   qs.set('limit','6');
   const epoch=++autoFillEpochRef.current;
   sparePoolRef.current=[];
   const response=await fetch('/api/cameras/live?'+qs,{cache:'no-store'});
   const data=await response.json();
   if(!data.success)throw new Error(data.error||'Live feed search failed');
   const sources=(data.cameras||[]).filter(c=>c.sourceType==='hls'&&c.videoUrl&&c.segmentFetchVerified===true)
     .slice(0,6).map(c=>({...c,autoAssigned:true}));
   if(!sources.length){
    setAutoError('No verified public HLS video feeds for this selected region or provider. Choose North America → United States → California, or arrange an authorized live-video provider for this country.');
    return;
   }
   sparePoolRef.current=sources;
   failedStreamsRef.current=new Set();
   setWallSlots([...sources,...Array(6-sources.length).fill(null)]);
   setSelectedWallSlot(null);
   if(sources.length<6)setAutoError('Only '+sources.length+' public HLS feeds passed the video-fragment check. Blank slots stay empty until an authorized working stream is found.');
   // Find spare feeds separately, without delaying the first six cameras.
   const spareQuery=new URLSearchParams(qs);
   spareQuery.set('start','24');
   fetch('/api/cameras/live?'+spareQuery,{cache:'no-store'})
    .then(r=>r.json())
    .then(extra=>{
     if(epoch!==autoFillEpochRef.current||!extra?.success)return;
     const used=new Set(sparePoolRef.current.map(c=>c.id));
     const more=(extra.cameras||[])
      .filter(c=>c.sourceType==='hls'&&c.videoUrl&&c.segmentFetchVerified===true&&!used.has(c.id))
      .map(c=>({...c,autoAssigned:true}));
     sparePoolRef.current=[...sparePoolRef.current,...more].slice(0,12);
     if(more.length){
      setWallSlots(previous=>{
       const used=new Set(previous.filter(Boolean).map(c=>c.id));
       return previous.map(camera=>{
        if(camera)return camera;
        const spare=more.find(c=>!used.has(c.id));
        if(spare){used.add(spare.id);return spare;}
        return null;
       });
      });
      if(sources.length<6&&more.length>=6-sources.length)setAutoError('');
     }
    }).catch(()=>{});
  }catch(e){setAutoError(e.message||'Unable to load live wall feeds')}
  finally{setAutoLoading(false);}
 };
 // On reload, previously auto-selected Caltrans feeds may have gone offline.
 // Revalidate them against segment-tested sources instead of restoring a stale
 // six-camera wall without checking that video bytes are still accessible.
 useEffect(()=>{
  if(!wallHydrated||!wallSlots.some(c=>c?.autoAssigned)||sparePoolRef.current.length)return;
  let active=true;
  const controller=new AbortController();
  fetch('/api/cameras/live?limit=6',{cache:'no-store',signal:controller.signal})
   .then(r=>r.json())
   .then(data=>{
    if(!active||sparePoolRef.current.length||!data.success)return;
    const valid=(data.cameras||[]).filter(c=>c.sourceType==='hls'&&c.segmentFetchVerified===true)
     .map(c=>({...c,autoAssigned:true}));
    sparePoolRef.current=valid;
    failedStreamsRef.current=new Set();
    const byId=new Map(valid.map(c=>[c.id,c]));
    const oldMissing=wallSlots.some(c=>c?.autoAssigned&&!byId.has(c.id));
    setWallSlots(prev=>{
     const used=new Set();
     return prev.map(camera=>{
      if(!camera?.autoAssigned)return camera;
      const same=byId.get(camera.id);
      if(same&&!used.has(same.id)){used.add(same.id);return same;}
      const spare=valid.find(c=>!used.has(c.id));
      if(spare){used.add(spare.id);return spare;}
      return null;
     });
    });
    if(oldMissing)setAutoError(
     'Some saved public camera streams have gone offline. ASURA attempted to replace them with tested video sources. Use Start all if Chrome requires a playback gesture.');
   })
   .catch(e=>{if(active&&e.name!=='AbortError')
    setAutoError('Saved cameras could not be revalidated: '+String(e.message||'network error').slice(0,140));});
  return()=>{active=false;controller.abort();};
 },[wallHydrated]);
 return <div className="space-y-6">
  <section className="defense-card p-5 space-y-4">
   <div className="flex flex-wrap justify-between gap-3">
    <div>
     <h2 className="text-lg font-semibold">Public Camera Directory</h2>
     <p className="text-sm text-slate-600">Operator-authorized travel cameras and public webcams. Coverage varies by country and licensing; private CCTV is not accessible here.</p>
    </div>
    <button type="button" onClick={()=>setRefresh(n=>n+1)} className="border rounded px-3 py-2 text-xs flex items-center gap-2">
      <RefreshCcw size={14}/> Refresh directory
    </button>
   </div>
   <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
    {[
     {id:'continent',label:'1. Continent',items:geo.continents.map(n=>({value:n,label:n}))},
     {id:'country',label:'2. Country',items:countries.map(n=>({value:n.code,label:n.name}))},
     {id:'state',label:'3. State / Province',items:(options.states||[]).map(n=>({value:n,label:n}))},
     {id:'district',label:'4. District',items:(options.districts||[]).map(n=>({value:n,label:n}))},
     {id:'region',label:'5. Region / County',items:(options.regions||[]).map(n=>({value:n,label:n}))},
    ].map(f=><label className="text-xs font-medium space-y-1" key={f.id}>
      <span className="block">{f.label}</span>
      <select value={filters[f.id]} onChange={e=>choose(f.id,e.target.value)}
        className="w-full rounded border bg-white p-2 text-sm">
       <option value="">All {f.id==='continent'?'continents':f.id==='country'?'countries':f.id==='state'?'states':f.id==='district'?'districts':'regions'}</option>
       {f.items.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}
       {filters[f.id]&&!f.items.some(x=>x.value===filters[f.id])&&
        <option value={filters[f.id]}>{filters[f.id]}</option>}
      </select>
    </label>)}
   </div>
   <div className="flex flex-wrap gap-3 items-end">
    <label className="text-xs flex-1 min-w-48 space-y-1">
      <span className="block font-semibold">Search public cameras</span>
      <div className="flex items-center border rounded px-3 gap-2">
       <Search size={15} className="text-slate-400"/>
       <input value={filters.q} onChange={e=>choose('q',e.target.value)} maxLength={90}
         placeholder="Road, county, nearby place…" className="w-full py-2 outline-none text-sm"/>
      </div>
    </label>
    <label className="text-xs space-y-1">
     <span className="block font-semibold">Camera provider</span>
     <select className="rounded border bg-white p-2 text-sm" value={filters.source} onChange={e=>choose('source',e.target.value)}>
      <option value="all">All connected sources</option><option value="caltrans">Caltrans CWWP2</option><option value="tfl">TfL JamCams (London)</option><option value="windy">Windy Webcams</option>
     </select>
    </label>
    <label className="flex items-center gap-2 text-xs font-medium rounded border px-3 py-2 bg-white">
      <input type="checkbox" checked={liveOnly} onChange={e=>{setLiveOnly(e.target.checked);setPage(0);setSelected(null);}}/>
      Only continuous HLS video
    </label>
    <button type="button" onClick={()=>setMapShown(x=>!x)} className="rounded border px-3 py-2 text-sm flex items-center gap-2">
      <MapPin size={15}/>{mapShown?'Hide map':'Map view'}
    </button>
    <button type="button" onClick={()=>{setFilters(initial);setPage(0);setSelected(null);}} className="rounded border px-3 py-2 text-sm">
     Reset filters
    </button>
   </div>
   <div className="flex gap-3 flex-wrap text-xs">
    {statuses.map(s=><span key={s.name} className={'px-3 py-1.5 rounded border '+(s.connected&&!s.notInCoverage?'bg-slate-50 text-slate-800':'bg-amber-50 text-amber-900')}>
      {s.name}: {s.notInCoverage?'Outside provider coverage':s.connected?s.count+' listed this request':s.reason||s.error||'Not connected'}
      {s.failedDistricts?.length?' · unavailable districts: '+s.failedDistricts.join(', '):''}
      {s.sampleOnly?' · paginated sample':''}
    </span>)}
   </div>
   {!windyConfigured&&<p className="text-xs text-slate-600">
    Worldwide Windy Webcams discovery is not active until <code>WINDY_WEBCAMS_API_KEY</code> is added to Vercel.
    The free tier supports licensed image links and embedded timelapses, not unrestricted camera redistribution.
   </p>}
   {error&&<p role="alert" className="bg-amber-50 rounded p-3 text-sm text-amber-900">{error}</p>}
   <p className="text-xs text-slate-500">
    {loading?'Requesting operator directories…':records.totalMatches!=null?
      records.totalMatches.toLocaleString()+' matching provider records · '+cameras.length+' shown on this page':
      cameras.length+' cameras on this provider page'}
    {' · '} Directory fetched: {formatTime(records.retrievedAt)}. A listing or in-service flag is not proof that a camera's image is current.
   </p>
  </section>
  <CameraWall slots={wallSlots} selectedSlot={selectedWallSlot}
    onSelectSlot={setSelectedWallSlot}
    onRemove={index=>setWallSlots(previous=>previous.map((camera,i)=>i===index?null:camera))}
    onClear={()=>{setWallSlots(Array(6).fill(null));setSelectedWallSlot(null);setAutoError('');}}
    onAutofill={autoFillWall} autoLoading={autoLoading} autoError={autoError}
    onFailedStream={replaceFailedStream}/>
  <details className="defense-card p-4">
    <summary className="cursor-pointer font-semibold text-sm">Connect an operator-approved public live stream (India or any other country)</summary>
    <p className="text-xs text-slate-600 mt-3">
      If an Indian traffic authority, tourism provider or another authorized operator supplies a public HTTPS HLS .m3u8 URL with embedding rights, you can display it directly in a wall slot. No APK or private CCTV credentials are needed. This browser-only connection is not stored or verified by ASURA; CORS restrictions may prevent playback.
    </p>
    <form onSubmit={addOperatorStream} className="mt-3 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <label className="text-xs">Camera name
          <input value={manualTitle} onChange={e=>setManualTitle(e.target.value)} maxLength={100} required
            className="block mt-1 w-full border rounded p-2" placeholder="e.g. Public traffic cam"/>
        </label>
        <label className="text-xs">Publishing operator
          <input value={manualOperator} onChange={e=>setManualOperator(e.target.value)} maxLength={100} required
            className="block mt-1 w-full border rounded p-2" placeholder="Agency / public webcam provider"/>
        </label>
        <label className="text-xs">Public HTTPS HLS playlist URL
          <input value={manualUrl} onChange={e=>setManualUrl(e.target.value)} inputMode="url" required
            className="block mt-1 w-full border rounded p-2" placeholder="https://operator.example/live/playlist.m3u8"/>
        </label>
      </div>
      <label className="inline-flex gap-2 items-center text-xs">
        <input type="checkbox" checked={manualAuthorized} onChange={e=>setManualAuthorized(e.target.checked)}/>
        I have permission to display this public operator-provided stream in ASURA.
      </label>
      <div className="flex gap-3 items-center flex-wrap">
        <button type="submit" className="bg-sky-700 text-white rounded px-4 py-2 text-xs">
          Add authorized stream to wall
        </button>
        <span className="text-xs text-slate-500">Choose a wall slot first if you want to replace a specific camera.</span>
      </div>
      {manualError&&<p role="alert" className="text-xs text-amber-900 bg-amber-50 p-3">{manualError}</p>}
    </form>
  </details>
  {mapShown&&<CameraPinMap cameras={cameras} onSelect={setSelected} selectedId={selected?.id}/>}
  <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
   <section className="defense-card xl:col-span-1 overflow-hidden">
    <div className="px-4 py-3 border-b flex items-center justify-between">
     <h3 className="font-semibold text-sm">Available camera records</h3>
     <span className="text-xs text-slate-500">{cameras.length} shown</span>
    </div>
    {loading&&<p className="p-4 text-sm text-slate-500">Loading public feed metadata…</p>}
    <div className="max-h-[680px] overflow-y-auto divide-y divide-slate-100">
     {!loading&&cameras.map(c=><div key={c.id} className={'flex items-stretch gap-2 p-2 '+(selected?.id===c.id?'bg-sky-50':'')}>
      <button type="button" onClick={()=>setSelected(c)} className="flex-1 min-w-0 text-left hover:bg-slate-50 rounded p-2">
       <div className="flex gap-2 items-center justify-between">
        <span className="font-medium text-sm text-slate-900 line-clamp-2">{c.title}</span>
        {c.sourceType==='hls'?<Video size={15} className="text-sky-600 flex-shrink-0"/>:<Camera size={15} className="text-slate-400 flex-shrink-0"/>}
       </div>
       <span className="text-xs text-slate-500 block mt-1">{[c.district,c.region,c.locality].filter(Boolean).join(' · ')}</span>
       <span className="text-xs text-slate-500 block">{c.provider} · {c.sourceType==='hls'?'Public HLS video stream':c.sourceType==='clip'?'Recorded MP4 clip':'Snapshot / preview (not live video)'}</span>
      </button>
      {c.sourceType==='hls'&&<button type="button" onClick={()=>assignToWall(c)}
       className="px-2 py-2 self-center rounded border border-sky-300 text-sky-700 text-[11px] whitespace-nowrap hover:bg-sky-50">
        Add to wall
      </button>}
     </div>)}
     {!loading&&!cameras.length&&<p className="p-4 text-sm text-slate-500">No operator-published cameras in this connected-source selection.</p>}
    </div>
    <div className="p-3 flex justify-between items-center border-t text-xs gap-2">
      <button type="button" disabled={page===0||loading} onClick={()=>{setPage(p=>Math.max(0,p-1));setSelected(null);}}
       className="border rounded px-3 py-2 disabled:opacity-40">Previous</button>
      <span>Page {page+1}</span>
      <button type="button" disabled={!records.hasMore||loading} onClick={()=>{setPage(p=>p+1);setSelected(null);}}
       className="border rounded px-3 py-2 disabled:opacity-40">Next</button>
    </div>
   </section>
   <div className="xl:col-span-2">
    <CameraDetail key={selected?.id||'unselected'} camera={selected} onAdd={assignToWall}/>
   </div>
  </div>
  <section className="defense-card p-4 space-y-2">
   <h3 className="text-sm font-semibold">Source rights, freshness and limits</h3>
   <p className="text-xs text-slate-600">{records.coverageNote||'Connected coverage is partial.'} Caltrans CWWP2 and Transport for London JamCams are official travel-information sources. Windy Webcams, when configured, is governed by its image-linking and player-embedding terms.</p>
   <p className="text-xs text-slate-600">Only public, operator-published images/streams are listed. ASURA does not attempt camera authentication, scan private networks, record people, identify individuals, or link people across cameras. Some streams block third-party playback or become unavailable without notice.</p>
   <a href="https://dot.ca.gov/programs/traffic-operations/traveler-information/cwwp"
      className="text-xs text-sky-700 underline" target="_blank" rel="noopener noreferrer">Caltrans official CWWP2 source</a>
   <span className="text-xs text-slate-500"> · </span>
   <a href="https://tfl.gov.uk/info-for/open-data-users/" target="_blank" rel="noopener noreferrer"
      className="text-xs text-sky-700 underline">TfL open data and licence</a>
   <span className="text-xs text-slate-500"> · </span>
   <a href="https://api.windy.com/webcams/docs" target="_blank" rel="noopener noreferrer"
      className="text-xs text-sky-700 underline">Windy Webcams API documentation</a>
  </section>
 </div>;
}
