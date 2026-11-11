'use client';
import {useEffect,useRef,useState} from 'react';

// One shared HLS.js instance factory, six independent MediaSource engines.
const HLS_SRC='https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';
function getHls(){
 if(window.Hls)return Promise.resolve(window.Hls);
 if(window.__asuraWallHls)return window.__asuraWallHls;
 window.__asuraWallHls=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src=HLS_SRC;
  script.crossOrigin='anonymous';
  script.onload=()=>window.Hls?resolve(window.Hls):reject(new Error('HLS decoder did not load'));
  script.onerror=()=>reject(new Error('HLS.js library unavailable'));
  document.head.appendChild(script);
 }).catch(e=>{window.__asuraWallHls=null;throw e;});
 return window.__asuraWallHls;
}
export default function ResilientHlsPlayer({camera,enabled,fit='contain',jumpToLiveTick=0,onHealth,onTerminal}){
 const videoRef=useRef(null),hlsRef=useRef(null),listenersRef=useRef({onHealth,onTerminal});
 useEffect(()=>{
  if(!jumpToLiveTick)return;
  const video=videoRef.current,player=hlsRef.current;
  if(!video)return;
  try{
   const edge=player?.liveSyncPosition;
   if(Number.isFinite(edge)&&edge>0&&Math.abs(video.currentTime-edge)>1){
    video.currentTime=edge;
   }else if(video.seekable?.length){
    const end=video.seekable.end(video.seekable.length-1);
    if(Number.isFinite(end)&&Math.abs(video.currentTime-end)>3)
      video.currentTime=Math.max(0,end-2);
   }
   if(video.paused)video.play().catch(()=>{});
  }catch{}
 },[jumpToLiveTick]);
 const [state,setState]=useState({kind:'connecting',label:'Connecting to operator…',age:null});
 const startFromClick=()=>{
  const video=videoRef.current;
  if(!video)return;
  video.muted=true;
  video.defaultMuted=true;
  const p=video.play();
  if(p&&typeof p.catch==='function'){
   p.catch(e=>setState({kind:'error',
    label:'Manual playback failed: '+String(e?.name||'Unknown')+' · '+String(e?.message||'').slice(0,70),age:null}));
  }
 };
 useEffect(()=>{listenersRef.current={onHealth,onTerminal}},[onHealth,onTerminal]);
 useEffect(()=>{
  let alive=true,hls=null,monitor=null,scheduled=null,live=null;
  let progressAt=Date.now(),startAt=Date.now(),previousPosition=-1,networkRecoveries=0,mediaRecoveries=0;
  let lastResumeAttempt=0,stableSince=0,hadVideo=false,mediaReady=false;
  let autoplayDenied=false;
  let failed=false,rendering=false,lastLabel='';
  const video=videoRef.current;
  const emit=(kind,label,age=null)=>{
   if(!alive)return;
   const key=kind+'|'+label+'|'+age;
   if(key===lastLabel)return;
   lastLabel=key;
   const next={kind,label,age};
   setState(next);listenersRef.current.onHealth?.(camera.id,next);
  };
  const terminal=(detail)=>{
   if(!alive||failed)return;
   failed=true;
   emit('error','Unavailable: '+String(detail).slice(0,72));
   listenersRef.current.onTerminal?.(camera);
  };
  if(!enabled){emit('paused','Paused by operator');return ()=>{alive=false;};}
  if(!video||!camera?.videoUrl){emit('error','Missing video stream');return ()=>{alive=false;};}
  const onTimeUpdate=()=>{
   if(!alive)return;
   const t=video.currentTime;
   if(Number.isFinite(t)&&Math.abs(t-previousPosition)>.05){
    previousPosition=t;progressAt=Date.now();rendering=true;hadVideo=true;
    if(!stableSince)stableSince=Date.now();
    if(Date.now()-stableSince>15000){networkRecoveries=0;mediaRecoveries=0;}
    emit(live===false?'recorded':'playing',
     live===false?'Playing recorded HLS':live===true?'Live HLS decoding · capture delay unknown':'Video decoding · source latency unverified',0);
   }
  };
  const onPlaying=()=>{
   autoplayDenied=false;
   if(!rendering)emit('buffering','Playback started · waiting for advancing frames');
  };
  const onWaiting=()=>{if(!failed)emit('buffering','Buffering…');};
  const onError=()=>{
   if(failed)return;
   const code=video.error?.code;
   const meaning=({1:'aborted',2:'network',3:'decoding',4:'unsupported media'})[code]||'unknown';
   emit('recovering','Video element error: '+meaning+' (code '+(code||'?')+')');
  };
  const onEnded=()=>{if(!failed)terminal('Operator stream ended unexpectedly');};
  const tryPlay=(cause)=>{
   if(!alive||failed||!mediaReady||!video||autoplayDenied)return;
   video.muted=true;
   video.defaultMuted=true;
   let attempt;
   try{attempt=video.play();}
   catch(e){attempt=Promise.reject(e);}
   if(attempt&&typeof attempt.catch==='function'){
    attempt.catch(e=>{
     if(!alive||failed)return;
     const type=String(e?.name||'PlaybackError');
     if(type==='NotAllowedError'){
      autoplayDenied=true;
      emit('gesture','Browser requires a click to start the muted video');
     }else if(type==='AbortError'){
      emit('buffering','Play interrupted (AbortError) · retrying stream');
     }else if(type==='NotSupportedError'){
      emit('recovering','Media format unsupported (NotSupportedError) · checking decoder');
     }else{
      emit('recovering','Play failed: '+type+' · '+String(e?.message||cause).slice(0,80));
     }
    });
   }
  };
  const autoResume=()=>{
   if(!alive||failed||!enabled||!video||!mediaReady||autoplayDenied||!video.paused)return;
   if(Date.now()-lastResumeAttempt<4500)return;
   lastResumeAttempt=Date.now();
   emit('recovering','Trying to resume paused video…');
   tryPlay('automatic retry');
  };
  const onVisible=()=>{
   if(!alive||failed||document.hidden)return;
   progressAt=Date.now();
   emit('recovering','Tab active — synchronizing live video');
   try{
    if(hls){
     hls.startLoad(-1);
     if(live===true&&Number.isFinite(hls.liveSyncPosition)){
      const delta=hls.liveSyncPosition-video.currentTime;
      if(delta>12)video.currentTime=hls.liveSyncPosition;
     }
    }
   }catch{}
   autoResume();
  };
  video.addEventListener('timeupdate',onTimeUpdate);
  video.addEventListener('playing',onPlaying);
  video.addEventListener('waiting',onWaiting);
  video.addEventListener('error',onError);
  video.addEventListener('ended',onEnded);
  document.addEventListener('visibilitychange',onVisible);
  window.addEventListener('pageshow',onVisible);
  video.muted=true;
  video.defaultMuted=true;
  video.setAttribute('muted','');
  video.playsInline=true;
  video.autoplay=true;
  video.preload='auto';

  // A sparse or frozen HLS source can show one valid frame forever.
  monitor=setInterval(()=>{
   if(!alive||failed)return;
   if(document.hidden){progressAt=Date.now();return;}
   if(video.paused&&mediaReady&&!autoplayDenied)autoResume();
   if(autoplayDenied){
    emit('gesture','Click Start video (browser playback permission)');
    return;
   }
   // Follow operator's rolling HLS edge, rather than drifting far behind.
   if(live===true&&hls&&Number.isFinite(hls.liveSyncPosition)&&
      hls.liveSyncPosition-video.currentTime>15&&video.readyState>=2){
    try{video.currentTime=hls.liveSyncPosition;}catch{}
   }
   const age=Math.max(0,Math.round((Date.now()-progressAt)/1000));
   if(rendering&&age<=12){
    emit(live===false?'recorded':'playing',
     live===false?'Recorded video progressing':live===true?'Live playlist · video progressing':'Video progressing · capture delay unverified',age);
   }else if(Date.now()-startAt<16000&&!rendering){
    emit('buffering','Waiting for first decoded frames…',age);
   }else if(age>25&&networkRecoveries>=3){
    terminal('No advancing video frames; camera needs reconnect');
   }else if(age>12&&hls&&networkRecoveries<3){
    networkRecoveries++;
    stableSince=0;
    emit('recovering','No new frames — reconnecting ('+networkRecoveries+'/3)',age);
    try{
     if(live===true&&Number.isFinite(hls.liveSyncPosition)&&
        Math.abs(hls.liveSyncPosition-video.currentTime)>12){
       video.currentTime=hls.liveSyncPosition;
     }
     hls.startLoad(-1);
    }catch{}
    progressAt=Date.now()-5000;
   }else if(age>12&&!mediaReady){
    if(age>30)terminal('No playable media was attached');
    else emit('buffering','Waiting for HLS manifest and media attachment…',age);
   }else if(age>12)emit('buffering','Waiting for video frames…',age);
  },4000);
  async function initialize(){
   if(video.canPlayType('application/vnd.apple.mpegurl')){
    video.src=camera.videoUrl;
    mediaReady=true;
    emit('connecting','Connecting native HLS…');
    tryPlay('native HLS playback');
    return;
   }
   const Hls=await getHls();
   if(!alive)return;
   if(!Hls.isSupported()){terminal('Browser does not support HLS decoding');return;}
   hls=new Hls({
    enableWorker:true,
    startLevel:0,
    capLevelToPlayerSize:true,
    maxBufferLength:8,
    maxMaxBufferLength:15,
    backBufferLength:2,
    lowLatencyMode:false,
    autoStartLoad:true,
   });
   hlsRef.current=hls;
   hls.on(Hls.Events.LEVEL_LOADED,(_name,payload)=>{
    live=payload?.details?.live===true;
    if(live===false)emit('recorded','Playlist is not live');
   });
   hls.on(Hls.Events.MANIFEST_PARSED,()=>{
    if(!alive)return;
    mediaReady=true;
    emit('buffering','HLS manifest loaded · waiting for video frames');
    tryPlay('HLS manifest parsed');
   });
   hls.on(Hls.Events.FRAG_BUFFERED,()=>{
    if(!alive||failed)return;
    mediaReady=true;
    if(video.paused&&!autoplayDenied)tryPlay('HLS segment buffered');
   });
   hls.on(Hls.Events.ERROR,(_name,error)=>{
    if(!alive||failed||!error?.fatal)return; // hls.js handles non-fatal errors internally
    const details=String(error.details||error.type||'Unknown playback fault');
    if(error.type===Hls.ErrorTypes.MEDIA_ERROR&&mediaRecoveries<3){
     mediaRecoveries++;
     stableSince=0;
     emit('recovering','Decoder recovery ('+mediaRecoveries+'/3)');
     try{hls.recoverMediaError()}catch{terminal('Decoder could not recover');}
    }else if(error.type===Hls.ErrorTypes.NETWORK_ERROR&&networkRecoveries<3){
     networkRecoveries++;
     stableSince=0;
     emit('recovering','Network retry ('+networkRecoveries+'/3)');
     scheduled=setTimeout(()=>{if(!alive||failed)return;try{hls.startLoad(-1)}catch{terminal(details)}},1500*networkRecoveries);
    }else terminal(details);
   });
   hls.on(Hls.Events.MEDIA_ATTACHED,()=>{
    if(alive&&!failed)hls.loadSource(camera.videoUrl);
   });
   hls.attachMedia(video);
  }
  initialize().catch(e=>terminal(e.message||'Could not initialize playback'));
  return()=>{
   alive=false;
   if(monitor)clearInterval(monitor);
   if(scheduled)clearTimeout(scheduled);
   video.removeEventListener('timeupdate',onTimeUpdate);
   video.removeEventListener('playing',onPlaying);
   video.removeEventListener('waiting',onWaiting);
   video.removeEventListener('error',onError);
   video.removeEventListener('ended',onEnded);
   document.removeEventListener('visibilitychange',onVisible);
   window.removeEventListener('pageshow',onVisible);
   try{hls?.destroy()}catch{}
   if(hlsRef.current===hls)hlsRef.current=null;
   try{video.pause();video.removeAttribute('src');video.load()}catch{}
  };
 },[camera?.id,camera?.videoUrl,enabled]);
 const shade=state.kind==='playing'?'border-emerald-400 bg-emerald-950/90 text-emerald-100':
  state.kind==='error'?'border-red-500 bg-red-950/95 text-red-100':
  state.kind==='recorded'?'border-amber-500 bg-amber-950/90 text-amber-100':
  'border-slate-500 bg-slate-900/90 text-slate-100';
 return <div className="relative w-full h-full flex flex-col min-h-0">
  <video ref={videoRef} muted autoPlay playsInline controls
   style={{objectFit:fit}}
   className="w-full h-full bg-black flex-1 min-h-0"
   aria-label={'Public HLS camera video: '+camera.title}/>
  {(state.kind==='gesture'||state.kind==='error')&&
   <button type="button" onClick={startFromClick}
    className="absolute z-10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-sky-700 hover:bg-sky-600 border border-sky-300 text-white rounded px-4 py-3 text-sm font-medium shadow-xl">
    ▶ Start / retry video
   </button>}
  <div className="absolute left-2 top-2 right-2 pointer-events-none flex justify-start">
   <span role="status" className={'inline-flex px-2 py-1 rounded border text-[10px] font-semibold max-w-full whitespace-normal '+shade}>
    {state.label}{state.age!==null?' · '+state.age+'s since progress':''}
   </span>
  </div>
 </div>;
}
