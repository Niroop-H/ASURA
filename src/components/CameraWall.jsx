'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {Maximize,Minimize,Play,Pause,RotateCcw,X,MonitorPlay,AlertTriangle,ExternalLink,Scan} from 'lucide-react';
import ResilientHlsPlayer from './ResilientHlsPlayer';

const MAX=6;
const isHls=c=>c?.sourceType==='hls'&&typeof c.videoUrl==='string'&&
  /^https:\/\//.test(c.videoUrl)&&/\.m3u8(?:\?|$)/i.test(c.videoUrl);
function WallTile({camera,index,selected,onSelect,onRemove,allPaused,onHealth,onTerminal}){
 const root=useRef(null);
 const [fullscreen,setFullscreen]=useState(false);
 const [paused,setPaused]=useState(false);
 const [status,setStatus]=useState(null);
 const [fit,setFit]=useState('contain');
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  const handler=()=>setFullscreen(document.fullscreenElement===root.current);
  document.addEventListener('fullscreenchange',handler);
  return()=>document.removeEventListener('fullscreenchange',handler);
 },[]);
 useEffect(()=>{setPaused(false);setStatus(null);setFit('contain');setRevision(0)},[camera?.id]);
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
    {camera&&live&&<button type="button" onClick={()=>setFit(v=>v==='contain'?'cover':'contain')}
      title={fit==='contain'?'Fill tile (crops picture)':'Show entire picture'}
      className="p-1.5 hover:bg-slate-700 rounded" aria-label={'Toggle picture fit on camera '+(index+1)}>
      <Scan size={14}/>
    </button>}
    {camera&&live&&<button type="button" onClick={()=>setRevision(n=>n+1)}
      title="Reconnect stream" className="p-1.5 hover:bg-slate-700 rounded"
      aria-label={'Reconnect camera '+(index+1)}><RotateCcw size={14}/></button>}
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
   {live?<ResilientHlsPlayer key={camera.id+':'+revision}
      camera={camera} enabled={!paused&&!allPaused} fit={fit}
      onHealth={(cameraId,health)=>{setStatus(health.label);onHealth?.(index,cameraId,health)}}
      onTerminal={record=>onTerminal?.(index,record)}/>:
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

export default function CameraWall({slots,onSelectSlot,selectedSlot,onRemove,onClear,onAutofill,autoLoading,autoError,onFailedStream}){
 const root=useRef(null);
 const [wallFullscreen,setWallFullscreen]=useState(false);
 const [pausedAll,setPausedAll]=useState(false);
 const [health,setHealth]=useState({});
 const handleHealth=(slot,cameraId,value)=>{
  setHealth(prev=>{
   const item=prev[slot];
   if(item?.id===cameraId&&item?.kind===value.kind&&item?.age===value.age&&item?.label===value.label)return prev;
   return {...prev,[slot]:{id:cameraId,...value}};
  });
 };
 const counts={playing:0,connecting:0,offline:0};
 for(let i=0;i<MAX;i++){
  const camera=slots[i];
  if(!camera)continue;
  const state=health[i];
  if(!state||state.id!==camera.id||['buffering','recovering','connecting'].includes(state.kind))counts.connecting++;
  else if(state.kind==='playing')counts.playing++;
  else if(state.kind==='error')counts.offline++;
 }
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
    <p className="text-xs text-slate-500">Six numbered slots · {liveCount} HLS URLs assigned · {counts.playing} decoding frames · {counts.connecting} connecting · {counts.offline} unavailable. Muted playback.</p>
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
  <div ref={root} className="camera-wall-grid relative grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 bg-slate-950 p-2 rounded-lg">

    {wallFullscreen&&<button type="button" onClick={enterWall}
      className="absolute top-3 right-3 z-20 bg-slate-800 border border-slate-500 rounded p-2 text-white text-xs"
      aria-label="Exit fullscreen camera wall">Exit fullscreen</button>}
    {Array.from({length:MAX},(_,i)=><WallTile key={i+'_'+(slots[i]?.id||'empty')} index={i}
      camera={slots[i]} selected={selectedSlot===i} allPaused={pausedAll}
      onSelect={onSelectSlot} onRemove={onRemove}
      onHealth={handleHealth} onTerminal={onFailedStream}/>)}
  </div>
  <p className="text-xs text-slate-500">
   Six streams can consume substantial bandwidth and CPU. Green indicates video frames advancing from an HLS live playlist—not a measured camera capture delay. Transient errors are retried; unavailable auto-selected streams are replaced with verified spare playlists when possible. No private cameras, recordings, or person tracking.
  </p>
 </section>;
}
