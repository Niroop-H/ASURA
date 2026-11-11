'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {Video,Maximize,Minimize,Play,Pause,RotateCcw,X,MonitorPlay,AlertTriangle,ExternalLink} from 'lucide-react';

const MAX=6;
const isHls=c=>c?.sourceType==='hls'&&typeof c.videoUrl==='string'&&
  /^https:\/\//.test(c.videoUrl)&&/\.m3u8(?:\?|$)/i.test(c.videoUrl);
const when=v=>{if(!v)return 'Unknown';const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleTimeString():'Unknown';};

function loadHls(){
 if(typeof window==='undefined')return Promise.reject(new Error('HLS playback needs a browser'));
 if(window.Hls)return Promise.resolve(window.Hls);
 if(window.__asuraWallHls)return window.__asuraWallHls;
 window.__asuraWallHls=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';
  script.crossOrigin='anonymous';
  script.onload=()=>window.Hls?resolve(window.Hls):reject(new Error('HLS playback library unavailable'));
  script.onerror=()=>reject(new Error('HLS playback library could not be downloaded'));
  document.head.appendChild(script);
 }).catch(e=>{window.__asuraWallHls=null;throw e});
 return window.__asuraWallHls;
}

function CameraVideo({camera,enabled,onStatus}){
 const ref=useRef(null),engine=useRef(null);
 const [status,setStatus]=useState({kind:'connecting',label:'Connecting…'});
 useEffect(()=>{
  const video=ref.current;
  let alive=true;
  let player=null;
  let verifiedLive=null;
  const report=(kind,label)=>{
   if(!alive)return;
   setStatus({kind,label});
   onStatus?.(kind,label);
  };
  if(!enabled){report('paused','Paused');return;}
  if(!video||!isHls(camera)){report('error','No authorized live HLS URL');return;}
  const onPlaying=()=>{
   report(verifiedLive===false?'warning':verifiedLive===true?'playing':'unverified',
     verifiedLive===true?'Live HLS playing':verifiedLive===false?'Recorded HLS — not a live stream':'Video playing · live timestamp unverified');
  };
  const onWaiting=()=>report('buffering','Buffering video…');
  const onError=()=>report('error','Playback failed (offline, CORS or codec error)');
  video.addEventListener('playing',onPlaying);
  video.addEventListener('waiting',onWaiting);
  video.addEventListener('error',onError);
  video.muted=true;
  video.autoplay=true;
  video.playsInline=true;
  const start=async()=>{
   if(video.canPlayType('application/vnd.apple.mpegurl')){
    video.src=camera.videoUrl;
    report('connecting','Native HLS source loaded · verifying playback');
    try{await video.play();}catch{report('paused','Press play to start native HLS');}
    return;
   }
   const Hls=await loadHls();
   if(!alive)return;
   if(!Hls.isSupported()){report('error','HLS unsupported by this browser');return;}
   player=new Hls({
    enableWorker:true,
    maxBufferLength:10,
    backBufferLength:0,
    maxMaxBufferLength:18,
    capLevelToPlayerSize:true,
    startLevel:-1,
    lowLatencyMode:false,
    autoStartLoad:true,
  });
   engine.current=player;
   player.on(Hls.Events.LEVEL_LOADED,(_event,data)=>{
    verifiedLive=Boolean(data.details?.live);
    if(verifiedLive===false)report('warning','Recorded playlist, not continuous live video');
   });
   player.on(Hls.Events.MANIFEST_PARSED,async()=>{
    if(!alive)return;
    report('buffering','HLS manifest loaded · buffering');
    try{await video.play();}catch{report('paused','Autoplay blocked — press play');}
   });
   player.on(Hls.Events.ERROR,(_event,data)=>{
    if(!alive)return;
    if(!data?.fatal)return;
    const detail=String(data.details||'unknown playback error');
    report('error','Stream unavailable: '+detail);
    // No attempts to bypass authorization or proxy streams.
   });
   player.loadSource(camera.videoUrl);
   player.attachMedia(video);
  };
  start().catch(e=>report('error',e.message||'HLS connection failed'));
  return()=>{
   alive=false;
   video.removeEventListener('playing',onPlaying);
   video.removeEventListener('waiting',onWaiting);
   video.removeEventListener('error',onError);
   try{player?.destroy()}catch{}
   engine.current=null;
   try{video.pause();video.removeAttribute('src');video.load()}catch{}
  };
 },[camera?.id,camera?.videoUrl,enabled]);
 return <div className="relative w-full h-full flex flex-col min-h-0">
  <video ref={ref} muted autoPlay controls playsInline
   className="w-full h-full object-contain bg-black flex-1 min-h-0" aria-label={'Live HLS camera stream '+camera.title}/>
  <div className="absolute top-2 left-2 pointer-events-none">
   <span className={'inline-flex items-center px-2 py-1 rounded text-[10px] font-semibold border backdrop-blur-sm '+
    (status.kind==='playing'?'bg-emerald-900/90 text-emerald-100 border-emerald-400':
     status.kind==='error'?'bg-red-950/90 text-red-100 border-red-500':
     status.kind==='buffering'||status.kind==='connecting'?'bg-slate-900/90 text-slate-100 border-slate-600':
     'bg-amber-950/90 text-amber-100 border-amber-600')}>
    {status.label}
   </span>
  </div>
 </div>;
}

function WallTile({camera,index,active,selected,onSelect,onRemove,allPaused}){
 const root=useRef(null);
 const [fullscreen,setFullscreen]=useState(false);
 const [paused,setPaused]=useState(false);
 const [status,setStatus]=useState(null);
 useEffect(()=>{
  const handler=()=>setFullscreen(document.fullscreenElement===root.current);
  document.addEventListener('fullscreenchange',handler);
  return()=>document.removeEventListener('fullscreenchange',handler);
 },[]);
 useEffect(()=>{setPaused(false);setStatus(null)},[camera?.id]);
 const goFullscreen=async()=>{
  try{
   if(document.fullscreenElement===root.current)await document.exitFullscreen();
   else if(root.current?.requestFullscreen)await root.current.requestFullscreen();
  }catch(e){setStatus('Fullscreen unavailable: '+e.message);}
 };
 const live=isHls(camera);
 return <article ref={root} className={'camera-wall-tile flex flex-col min-w-0 min-h-0 overflow-hidden rounded-md border '+
  (selected?'border-sky-400 ring-1 ring-sky-500':'border-slate-700')+' bg-slate-950 text-slate-100'}>
  <div className="flex items-center justify-between gap-2 p-2 bg-slate-900 border-b border-slate-700">
   <div className="flex items-center gap-2 min-w-0">
    <span className="shrink-0 rounded bg-slate-700 text-[10px] px-1.5 py-1 font-bold">CAM {index+1}</span>
    <span className="text-xs truncate" title={camera?.title||'Empty camera slot'}>{camera?.title||'Choose a public camera'}</span>
   </div>
   <div className="flex gap-1 shrink-0">
    {camera&&live&&<button type="button" onClick={()=>setPaused(v=>!v)}
      title={paused?'Resume stream':'Pause stream'}
      className="p-1.5 hover:bg-slate-700 rounded" aria-label={paused?'Resume camera '+(index+1):'Pause camera '+(index+1)}>
      {paused?<Play size={14}/>:<Pause size={14}/>}
    </button>}
    {camera&&<button type="button" onClick={goFullscreen} title={fullscreen?'Exit fullscreen':'Fullscreen camera'}
     className="p-1.5 hover:bg-slate-700 rounded" aria-label={'Toggle fullscreen camera '+(index+1)}>
      {fullscreen?<Minimize size={15}/>:<Maximize size={15}/>}
    </button>}
    <button type="button" onClick={()=>onRemove(index)} disabled={!camera}
      title="Remove camera" className="p-1.5 hover:bg-slate-700 rounded disabled:opacity-25" aria-label={'Remove camera '+(index+1)}><X size={15}/></button>
   </div>
  </div>
  <div className="aspect-video relative flex-1 min-h-0 bg-black">
   {live?<CameraVideo camera={camera} enabled={!paused&&!allPaused} onStatus={(_kind,label)=>setStatus(label)}/>:
    <button type="button" onClick={()=>onSelect(index)}
      className="w-full h-full flex flex-col gap-2 items-center justify-center text-slate-400 hover:bg-slate-900 text-xs p-4">
      {camera?<AlertTriangle size={23}/>:<MonitorPlay size={23}/>}
      <span>{camera?'This source is not continuous live HLS.':'Select this slot, then add a live camera from the directory.'}</span>
      {camera&&<span className="text-amber-300">{camera.sourceType==='clip'?'Recorded MP4 clip':camera.sourceType==='snapshot'?'Refreshed snapshot':'External webcam player'}</span>}
    </button>}
  </div>
  <div className="flex gap-2 items-center justify-between p-2 border-t border-slate-800 bg-slate-900">
   <button type="button" onClick={()=>onSelect(index)}
    className={'text-[11px] underline truncate text-left '+(selected?'text-sky-300':'text-slate-300')}>
    {selected?'Selected — choose a camera below':'Replace feed in this slot'}
   </button>
   {camera?.videoUrl&&<a href={camera.videoUrl} rel="noreferrer noopener" target="_blank"
    className="shrink-0 text-slate-400 hover:text-white" title="Open operator stream"><ExternalLink size={14}/></a>}
  </div>
 </article>;
}

export default function CameraWall({slots,onSelectSlot,selectedSlot,onRemove,onClear,onAutofill,autoLoading,autoError}){
 const root=useRef(null);
 const [wallFullscreen,setWallFullscreen]=useState(false);
 const [pausedAll,setPausedAll]=useState(false);
 useEffect(()=>{
  const handler=()=>setWallFullscreen(document.fullscreenElement===root.current);
  document.addEventListener('fullscreenchange',handler);
  return()=>document.removeEventListener('fullscreenchange',handler);
 },[]);
 const liveCount=useMemo(()=>slots.filter(isHls).length,[slots]);
 const enterWall=async()=>{
  try{
   if(document.fullscreenElement===root.current)await document.exitFullscreen();
   else await root.current?.requestFullscreen?.();
  }catch(e){console.warn('Fullscreen unavailable:',e.message);}
 };
 return <section className="defense-card p-4 space-y-3" aria-label="Six-camera monitoring wall">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div>
    <h2 className="font-semibold text-lg flex items-center gap-2"><MonitorPlay size={20}/> Six-Camera Live Wall</h2>
    <p className="text-xs text-slate-500">Six numbered slots · {liveCount} HLS stream URL{liveCount===1?'':'s'} assigned · muted playback · independent fullscreen</p>
   </div>
   <div className="flex flex-wrap gap-2">
    <button type="button" onClick={onAutofill} disabled={autoLoading}
      className="rounded bg-sky-700 text-white px-3 py-2 text-xs disabled:opacity-50">
      {autoLoading?'Checking six playlists…':'Fill with 6 available live streams'}
    </button>
    <button type="button" onClick={()=>setPausedAll(v=>!v)}
     className="rounded border px-3 py-2 text-xs inline-flex items-center gap-1">
     {pausedAll?<Play size={14}/>:<Pause size={14}/>} {pausedAll?'Resume all':'Pause all'}
    </button>
    <button type="button" onClick={enterWall}
     className="rounded border px-3 py-2 text-xs inline-flex items-center gap-1">
     {wallFullscreen?<Minimize size={14}/>:<Maximize size={14}/>} {wallFullscreen?'Exit wall fullscreen':'Fullscreen wall'}
    </button>
    <button type="button" onClick={onClear} className="rounded border px-3 py-2 text-xs inline-flex items-center gap-1"><X size={14}/> Clear wall</button>
   </div>
  </div>
  {autoError&&<p className="text-xs p-3 rounded bg-amber-50 text-amber-900" role="alert">{autoError}</p>}
  <div ref={root} className="camera-wall-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 bg-slate-950 p-2 rounded-lg">
    {Array.from({length:MAX},(_,i)=><WallTile key={i+'_'+(slots[i]?.id||'empty')} index={i}
      camera={slots[i]} selected={selectedSlot===i} allPaused={pausedAll}
      onSelect={onSelectSlot} onRemove={onRemove}/>)}
  </div>
  <p className="text-xs text-slate-500">
   Six live streams can use significant internet bandwidth. Streams must be publicly authorized HLS sources and allow playback in your browser; playlist availability does not guarantee uninterrupted video. Camera feeds are not synchronized, recorded or tracked by ASURA.
  </p>
 </section>;
}
