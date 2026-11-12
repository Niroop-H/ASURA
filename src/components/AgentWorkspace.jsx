'use client';

import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import RichAgentAnswer from './RichAgentAnswer';
import {
 Send,LoaderCircle,Plus,MessageSquareText,Activity,Camera,Newspaper,Plane,CloudSun,
 Globe2,ExternalLink,ChevronDown,ShieldAlert,Search,MapPin,Database,Copy,Check
} from 'lucide-react';

const SOURCE_OPTIONS=[
 ['news','News'],['weather','Weather'],['flights','Aircraft'],['cameras','Public cameras'],
 ['airports','Airports'],['earthquakes','Earthquakes'],['events','Earth events'],['search','Web search']
];
const REGIONS=[['bengaluru','Bengaluru'],['london','London'],['singapore','Singapore'],
 ['newyork','New York'],['dubai','Dubai']];
const examples=[
 {title:'Talk to DEVASHRI',prompt:'Hey DEVASHRI, what can you help me do?'},
 {title:'Latest headlines',prompt:'Summarize the latest available news headlines and cite the sources.'},
 {title:'Live aviation',prompt:'What can the public ADS-B aircraft feed currently tell us around Bengaluru?'},
 {title:'Public camera coverage',prompt:'Which authorized public camera directories are connected and what are their limitations?'},
];
const readableDate=x=>{if(!x)return 'Not provided';const d=new Date(x);return Number.isFinite(d.getTime())?'Not provided':d.toLocaleString()};
function SourceDetails({msg,onReview}){
 const records=Array.isArray(msg.records)?msg.records:[];
 const statuses=Array.isArray(msg.statuses)?msg.statuses:[];
 if(!records.length&&!statuses.length&&!msg.snapshotReviewed&&
    !(msg.webResearch?.sources||[]).length)return null;
 return <div className="mt-3 border-t pt-3 border-slate-200 space-y-3">
  <div className="flex flex-wrap gap-2">
   {statuses.map(s=><span key={s.source} title={[s.note,s.error,s.provider,
      s.observationType,s.providerTime?'Provider time: '+readableDate(s.providerTime):''].filter(Boolean).join(' · ')}
     className={'rounded border px-2 py-1 text-[11px] '+(s.success?'bg-white text-slate-600':'bg-amber-50 border-amber-300 text-amber-900')}>
     {s.source}: {s.success?'source retrieved':'source unavailable'}
   </span>)}
  </div>
  {msg.dataVerification==='unavailable'&&<div role="status" className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
   <strong>Verified airport data unavailable.</strong> Receiver-observed aircraft positions cannot confirm landings or departures.
  </div>}
  {msg.dataVerification==='provider-reported-partial'&&<p className="text-xs text-slate-600">
   Flight operations are provider-reported and may cover only the first page. Check actual arrival/departure times separately from schedules.
  </p>}
  {msg.externalBoardUrl&&<a href={msg.externalBoardUrl} target="_blank" rel="noopener noreferrer"
   className="text-xs underline text-sky-700 inline-flex items-center gap-1">
   Open external airport arrivals/departures board <ExternalLink size={12}/>
  </a>}
  {Array.isArray(msg.webResearch?.sources)&&msg.webResearch.sources.length>0&&
   <div className="rounded border bg-white p-3 text-xs space-y-2">
    <p className="font-semibold text-slate-700">Verified public browser-search sources</p>
    {msg.webResearch.sources.map((entry,i)=>
     <a key={entry.url+'-'+i} href={entry.url} target="_blank"
      rel="noopener noreferrer" className="block underline text-sky-700 break-all">
      {entry.title||entry.url} <ExternalLink size={11} className="inline"/>
     </a>)}
   </div>}
  {msg.snapshotReviewed&&<p className="text-xs text-amber-900 bg-amber-50 rounded p-2">
   Snapshot reviewed: {msg.snapshotReviewed.title}, downloaded {readableDate(msg.snapshotReviewed.checkedAt)}.
   Original capture time not verified. This is not continuous CCTV analysis.
  </p>}
  {records.length>0&&<details className="rounded border border-slate-200 bg-white">
   <summary className="cursor-pointer p-3 text-xs font-semibold text-slate-700">
    View source records ({records.length}) · checked {readableDate(msg.checkedAt)}
   </summary>
   <div className="max-h-96 overflow-y-auto divide-y">
    {records.map((r,i)=><div key={r.id+'-'+i} className="p-3 text-xs space-y-1">
      <div className="font-medium">{r.id} · {r.title}</div>
      <p className="text-slate-600">{r.description||'No additional description supplied'}</p>
      <p className="text-slate-500">
       {r.provider} · observed/published: {readableDate(r.observedAt)} · retrieved: {readableDate(r.retrievedAt)}
      </p>
      {Number.isFinite(r.positionAgeSeconds)&&<p className="text-slate-500">
       Aircraft position age: {r.positionAgeSeconds} seconds ·
       {Number.isFinite(r.distanceNm)?' '+r.distanceNm+' NM from search center ·':''}
       Not a verified arrival or departure
      </p>}
      <div className="flex flex-wrap gap-4">
       {r.url&&<a href={r.url} target="_blank" rel="noopener noreferrer"
        className="text-sky-700 underline inline-flex items-center gap-1">
        Operator/source <ExternalLink size={12}/>
       </a>}
       {r.source==='cameras'&&r.cameraId&&r.snapshotAvailable&&<button type="button"
         onClick={()=>onReview(r)} className="text-sky-700 underline inline-flex items-center gap-1">
         Select snapshot and ask your question <Camera size={12}/>
       </button>}
      </div>
    </div>)}
   </div>
  </details>}
  {statuses.filter(s=>!s.success).map(s=><p key={s.source} className="text-xs text-amber-800">
   {s.source}: {s.error||'Provider unavailable'}
  </p>)}
 </div>;
}

export default function AgentWorkspace(){
 const [messages,setMessages]=useState([]);
 const [draft,setDraft]=useState('');
 const [mode,setMode]=useState('auto');
 const [webResearch,setWebResearch]=useState(true);
 const [forceWebResearch,setForceWebResearch]=useState(false);
 const [sources,setSources]=useState(['news','weather','flights','cameras','airports','earthquakes','events']);
 const [region,setRegion]=useState('bengaluru');
 const [busy,setBusy]=useState(false);
 const [health,setHealth]=useState(null);
 const [showSettings,setShowSettings]=useState(false);
 const [copied,setCopied]=useState(null);
 const [linkedCamera,setLinkedCamera]=useState(null);
 const [useSelectedSnapshot,setUseSelectedSnapshot]=useState(true);
 const [snapshotPreviewRevision,setSnapshotPreviewRevision]=useState(0);
 const [linkedWeather,setLinkedWeather]=useState(null);
 const controller=useRef(null);
 const bottom=useRef(null);
 const input=useRef(null);
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search);
  const cameraId=params.get('camera')||'';
  const title=params.get('cameraTitle')||'Selected public camera';
  if(/^(?:caltrans-|tfl-)[a-zA-Z0-9 _-]{1,110}$/.test(cameraId)){
    setLinkedCamera({id:cameraId,title:title.slice(0,110)});
    setUseSelectedSnapshot(true);
  }
  const lat=Number(params.get('weatherLat')),lon=Number(params.get('weatherLon'));
  const rawLat=params.get('weatherLat'),rawLon=params.get('weatherLon');
  if(rawLat!==null&&rawLon!==null&&Number.isFinite(lat)&&Number.isFinite(lon)&&
   Math.abs(lat)<=90&&Math.abs(lon)<=180){
   setLinkedWeather({lat,lon,label:(params.get('weatherLocation')||'Selected point').slice(0,130)});
  }
 },[]);
 useEffect(()=>{
  let mounted=true;
  fetch('/api/agent',{cache:'no-store'}).then(r=>r.json()).then(d=>{if(mounted)setHealth(d)})
    .catch(e=>{if(mounted)setHealth({ready:false,error:e.message})});
  return()=>{mounted=false;controller.current?.abort()};
 },[]);
 useEffect(()=>{bottom.current?.scrollIntoView({block:'end',behavior:'smooth'})},[messages,busy]);
 const send=async(message,extra={})=>{
  const question=String(message||'').trim();
  if(!question||busy)return;
  const previous=messages.map(m=>({role:m.role,content:m.content}));
  // A selected snapshot is context; no AI request without the user's message.
  const camera=linkedCamera&&useSelectedSnapshot?linkedCamera:null;
  setMessages(m=>[...m,{id:Date.now()+'u',role:'user',content:question}]);
  setDraft('');setBusy(true);
  const ac=new AbortController();
  controller.current=ac;
  try{
   const r=await fetch('/api/agent',{
    method:'POST',cache:'no-store',signal:ac.signal,
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({message:question,history:previous.slice(-10),
     mode,sources,region,webResearch,forceWebResearch,...extra,
     ...(camera?{reviewCamera:true,cameraId:camera.id}:{})}),
   });
   const d=await r.json();
   setMessages(m=>[...m,{id:Date.now()+'a',role:'assistant',content:d.answer||'',
    error:d.success?null:d.error||'AI response unavailable',model:d.model||null,
    records:d.records||[],statuses:d.statuses||[],snapshotReviewed:d.snapshotReviewed||null,
    webResearch:d.webResearch||null,
    checkedAt:d.checkedAt||null,generatedAt:d.generatedAt||null,
    dataVerification:d.dataVerification||null,answerType:d.answerType||null,
    externalBoardUrl:d.externalBoardUrl||null,airport:d.airport||null}]);
   if(!d.success&&d.diagnostics?.stage==='model-discovery')setHealth(x=>({...x,ready:false,error:d.error}));
  }catch(e){
   if(e.name!=='AbortError')setMessages(m=>[...m,{id:Date.now()+'err',role:'assistant',
    content:'',error:'Unable to contact the ASURA agent: '+e.message}]);
  }finally{setBusy(false);controller.current=null;input.current?.focus();}
 };
 const review=(r)=>{
  if(!r?.cameraId)return;
  setLinkedCamera({id:r.cameraId,title:String(r.title||'Selected public camera').slice(0,110)});
  setUseSelectedSnapshot(true);
  setSnapshotPreviewRevision(v=>v+1);
  requestAnimationFrame(()=>input.current?.focus());
 };
 const newChat=()=>{
  controller.current?.abort();controller.current=null;
  setMessages([]);setDraft('');setBusy(false);
  setLinkedCamera(null);setUseSelectedSnapshot(true);input.current?.focus();
 };
 const copyAnswer=async(msg)=>{
  try{await navigator.clipboard.writeText(msg.content||'');setCopied(msg.id);setTimeout(()=>setCopied(null),1700);}
  catch{}
 };
 return <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_270px] gap-5 min-h-[65vh]">
  <section className="defense-card min-w-0 flex flex-col overflow-hidden" aria-label="DEVASHRI AI conversation">
   <header className="px-5 py-4 border-b bg-white flex flex-wrap gap-3 justify-between items-center">
    <div className="flex items-center gap-2">
     <div className="rounded-lg bg-slate-900 p-2 text-cyan-400"><MessageSquareText size={20}/></div>
     <div>
      <h2 className="font-bold text-slate-900 text-base">DEVASHRI</h2>
      <p className="text-xs text-slate-500">ASURA's AI Agent · conversation and connected public data</p>
     </div>
    </div>
    <div className="flex gap-2 items-center">
     <span className={'rounded px-2 py-1 text-xs border '+(health?.ready?'bg-emerald-50 border-emerald-200 text-emerald-800':'bg-amber-50 border-amber-200 text-amber-900')}>
       {health===null?'Checking AI provider…':health.ready?'AI online':'Provider attention needed'}
     </span>
     <button type="button" onClick={newChat} className="border rounded px-3 py-2 text-xs flex items-center gap-1">
      <Plus size={14}/> New chat
     </button>
    </div>
   </header>
   {health&&!health.ready&&<div role="alert" className="px-5 py-3 bg-amber-50 text-amber-900 text-xs border-b">
    ASURA large reasoning model unavailable: {health.error||'120B access not configured'}.
    Check your server-side Groq key and model permissions in <Link className="underline" href="/keys">API Key Holders</Link>.
   </div>}
   <div className="flex-1 px-4 md:px-6 py-6 bg-slate-50 min-h-[380px] max-h-[68vh] overflow-y-auto space-y-5">
    {linkedCamera&&health?.visionAvailable===false&&<p role="status"
     className="rounded border border-amber-300 bg-amber-50 text-amber-950 p-3 text-xs">
     Groq's larger-than-50B vision model (Muse Spark Open 816B) requires
     preview access and is unavailable on this account. No smaller model
     is substituted. General text chat and public-source research work independently.
    </p>}
    {linkedCamera&&<div className="bg-sky-50 border border-sky-200 rounded-lg p-4 space-y-3" aria-label="Selected public camera snapshot">
      <div className="flex flex-wrap gap-3 items-center justify-between">
       <div>
        <p className="text-sm font-semibold text-slate-900">Selected snapshot: {linkedCamera.title}</p>
        <p className="text-xs text-slate-600">
         You choose the question. DEVASHRI will not generate a description until you send a message.
        </p>
       </div>
       <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs flex gap-2 items-center text-slate-700">
         <input type="checkbox" checked={useSelectedSnapshot}
           onChange={e=>setUseSelectedSnapshot(e.target.checked)}
           aria-label="Include selected public camera snapshot in my questions"/>
         Include snapshot
        </label>
        <button type="button" onClick={()=>setSnapshotPreviewRevision(v=>v+1)}
          className="text-xs rounded border border-sky-200 bg-white px-3 py-2">Refresh preview</button>
        <button type="button" onClick={()=>setLinkedCamera(null)}
          className="text-xs rounded border border-slate-200 bg-white px-3 py-2">Detach</button>
       </div>
      </div>
      <img key={linkedCamera.id+':'+snapshotPreviewRevision}
       src={'/api/cameras/snapshot?cameraId='+encodeURIComponent(linkedCamera.id)+'&revision='+snapshotPreviewRevision}
       alt={'Latest operator-published snapshot preview: '+linkedCamera.title}
       loading="lazy" className="w-full max-w-xl max-h-64 object-contain rounded bg-slate-950 border border-sky-200"/>
      <p className="text-xs text-slate-600">
       This preview is an operator-published still, not live video. Original capture time is unverified.
       Each question including the snapshot retrieves the latest available frame, which may differ from the preview.
      </p>
     </div>}
    {linkedWeather&&<div className="bg-sky-50 border border-sky-200 rounded-lg p-4 flex flex-wrap gap-3 items-center justify-between">
      <div>
       <p className="text-sm font-semibold text-slate-900">Global weather point: {linkedWeather.label}</p>
       <p className="text-xs text-slate-600">{linkedWeather.lat.toFixed(4)}°, {linkedWeather.lon.toFixed(4)}° · OpenWeather point forecast, not state-wide weather</p>
      </div>
      <button type="button" disabled={busy}
       onClick={()=>send('Give the latest available current weather and short-term forecast for my selected weather point '+linkedWeather.label+'. Cite the provider, observation time, and differentiate current conditions from predictions.',{
        mode:'auto',weatherPoint:linkedWeather
       })}
       className="bg-sky-700 text-white rounded px-3 py-2 text-xs disabled:opacity-40">
       Ask DEVASHRI about this weather
      </button>
    </div>}
    {!messages.length&&!linkedCamera&&<div className="max-w-2xl mx-auto pt-8 space-y-6">
      <div className="text-center space-y-2">
       <div className="text-3xl font-semibold text-slate-900">What would you like to explore?</div>
       <p className="text-sm text-slate-600">
        ASURA Defense Intelligence System™ combines 120B-model reasoning
        with connected public feeds and on-demand web research. Ask a natural question;
        supporting source records and timestamps are shown when available.
       </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
       {examples.map(x=><button type="button" key={x.title} onClick={()=>send(x.prompt)}
        className="text-left bg-white border hover:border-sky-400 hover:bg-sky-50 rounded-lg p-4 space-y-2">
        <p className="text-sm font-semibold text-slate-800">{x.title}</p>
        <p className="text-xs text-slate-500">{x.prompt}</p>
       </button>)}
      </div>
      <p className="text-center text-xs text-slate-500">Current information depends on connected sources; the agent cannot watch or analyze continuous CCTV streams yet.</p>
    </div>}
    {messages.map(msg=><div key={msg.id} className={'flex '+(msg.role==='user'?'justify-end':'justify-start')}>
     <div className={'max-w-[95%] md:max-w-[88%] rounded-xl px-4 py-3 shadow-sm text-sm space-y-2 '+
      (msg.role==='user'?'bg-slate-900 text-white':'bg-white border border-slate-200 text-slate-800')}>
      {msg.role==='assistant'?<RichAgentAnswer text={msg.content}/>:<p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>}
      {msg.error&&<p role="alert" className="bg-amber-50 text-amber-900 p-3 text-xs rounded border border-amber-100">{msg.error}</p>}
      {msg.role==='assistant'&&<div className="pt-1 flex flex-wrap gap-3 items-center">
       {msg.model&&<span className="text-[11px] text-slate-600 font-medium">Model: {msg.model}</span>}
       {msg.webResearch?.requested&&<span className={'text-[11px] '+
         (msg.webResearch.executedVerified?'text-emerald-800':'text-amber-800')}>
        {msg.webResearch.executedVerified?'Public web tool executed':'Web tool offered; not verified'}
       </span>}
       {msg.generatedAt&&<span className="text-[11px] text-slate-400">{readableDate(msg.generatedAt)}</span>}
       {msg.content&&<button type="button" onClick={()=>copyAnswer(msg)}
        className="text-xs text-slate-500 inline-flex gap-1 items-center hover:text-sky-700">
        {copied===msg.id?<Check size={13}/>:<Copy size={13}/>} {copied===msg.id?'Copied':'Copy'}
       </button>}
      </div>}
      {msg.role==='assistant'&&<SourceDetails msg={msg} onReview={review}/>}
     </div>
    </div>)}
    {busy&&<div className="flex justify-start">
     <div className="rounded-xl bg-white border px-4 py-3 flex items-center gap-2 text-sm text-slate-600">
      <LoaderCircle size={16} className="animate-spin"/> DEVASHRI is preparing a response…
     </div>
    </div>}
    <div ref={bottom}/>
   </div>
   <div className="px-4 md:px-5 py-4 bg-white border-t space-y-3">
    <div className="flex flex-wrap items-center gap-2">
     <span className="text-xs text-slate-500">Mode:</span>
     {[
      ['auto','Auto sources'],['general','Conversation'],['live','Live sources']
     ].map(([key,label])=><button key={key} type="button" onClick={()=>setMode(key)}
       className={'text-xs rounded-full border px-3 py-1.5 '+(mode===key?'bg-sky-700 text-white border-sky-700':'bg-white text-slate-600')}>
       {label}
      </button>)}
     <button type="button" onClick={()=>setShowSettings(v=>!v)}
       className="text-xs text-slate-500 underline inline-flex gap-1 items-center ml-auto">
       Data sources <ChevronDown size={13}/>
     </button>
    </div>
    {showSettings&&<div className="rounded-lg border p-3 space-y-3 bg-slate-50">
      <p className="text-xs text-slate-600">
       DEVASHRI uses a 120B reasoning model for text chat. Auto mode selects
       connected public providers and lets the model use browser research.
       Live mode fetches your selected feeds; Conversation is offline-only.
       Model training knowledge is not a verified live source.
      </p>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
       <label className="flex items-center gap-2 text-xs font-medium">
        <input type="checkbox" checked={webResearch}
          onChange={e=>setWebResearch(e.target.checked)}/>
        Enable on-demand public web research
       </label>
       <label className="flex items-center gap-2 text-xs font-medium">
        <input type="checkbox" checked={forceWebResearch}
          disabled={!webResearch||mode==='general'}
          onChange={e=>setForceWebResearch(e.target.checked)}/>
        Require fresh web search for every question
       </label>
      </div>
      <p className="text-xs text-slate-500">
       Public search consumes Groq quota. Indexed websites and connected feeds can
       be incomplete or delayed. This does not grant access to private cameras.
      </p>
      <div className="flex flex-wrap gap-3">
       {SOURCE_OPTIONS.map(([id,label])=><label key={id} className="inline-flex gap-1 items-center text-xs">
        <input type="checkbox" checked={sources.includes(id)}
         onChange={e=>setSources(prev=>e.target.checked?[...prev,id]:prev.filter(v=>v!==id))}/>
        {label}
       </label>)}
      </div>
      <label className="block text-xs">Airspace location (regional ADS-B searches)
       <select value={region} onChange={e=>setRegion(e.target.value)} className="block mt-1 rounded border p-2 text-xs bg-white">
        {REGIONS.map(([id,name])=><option key={id} value={id}>{name}</option>)}
       </select>
      </label>
    </div>}
    {linkedCamera&&useSelectedSnapshot&&<p className="text-xs text-sky-800 font-medium flex items-center gap-2">
      <Camera size={14}/> Your next question will include the selected public snapshot.
    </p>}
    <form onSubmit={e=>{e.preventDefault();send(draft)}} className="flex gap-2 items-end">
     <textarea ref={input} value={draft} onChange={e=>setDraft(e.target.value)}
      onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(draft)}}}
      rows={2} maxLength={2500}
      aria-label={linkedCamera&&useSelectedSnapshot?'Your question about the selected snapshot':'Message DEVASHRI'}
      placeholder={linkedCamera&&useSelectedSnapshot?
       'Ask your own question about this snapshot…':
       'Message DEVASHRI… ask anything, or request recent news, flight data, weather or public camera information.'}
      className="flex-1 min-w-0 resize-y rounded-lg border border-slate-300 p-3 text-sm outline-none focus:ring-2 focus:ring-sky-400 max-h-48"/>
     <button type="submit" disabled={busy||!draft.trim()} aria-label="Send message to DEVASHRI"
      className="p-3 bg-sky-700 text-white rounded-lg disabled:opacity-40"><Send size={19}/></button>
    </form>
    <p className="text-[11px] text-slate-500">
     Primary model: GPT-OSS 120B · Public observations and websites may be delayed or
     incomplete. Verify original sources for consequential decisions.
     Conversation history remains in this browser tab only.
    </p>
   </div>
  </section>
  <aside className="space-y-4 xl:sticky xl:top-6 self-start">
   <section className="defense-card p-4 space-y-3">
    <h3 className="font-semibold text-sm flex items-center gap-2"><Activity size={16} className="text-sky-700"/> Connected intelligence</h3>
    <p className="text-xs text-slate-500">
     Active large model: {health?.model||'Checking Groq access'}.
     On-demand public browser research is offered in Auto and Live modes.
     Connected adapters report their own timestamps and partial coverage.
    </p>
    <div className="space-y-2 text-xs">
     {[
      [Newspaper,'News headlines','Publisher reports · may be delayed'],
      [Plane,'Aircraft observations','Regional ADS-B · partial coverage'],
      [CloudSun,'Weather','Configured provider · city coverage varies'],
      [Camera,'Public camera directories','Caltrans / TfL metadata, not live video analysis'],
      [Globe2,'Earth observations','NASA EONET / USGS'],
      [MapPin,'Airport directory','Global facility records · not live status'],
     ].map(([Icon,title,desc])=><div key={title} className="flex gap-2 items-start">
       <Icon size={15} className="mt-0.5 text-sky-700 shrink-0"/>
       <div><p className="font-semibold text-slate-700">{title}</p><p className="text-slate-500">{desc}</p></div>
     </div>)}
    </div>
   </section>
   <section className="defense-card p-4 space-y-3 text-xs">
    <h3 className="font-semibold text-sm">ASURA workspaces</h3>
    <div className="flex flex-col gap-2 text-sky-700 underline">
     <Link href="/cameras">Public Camera Explorer</Link>
     <Link href="/flights">Live Flight Explorer</Link>
     <Link href="/globe">Cesium 3D Globe</Link>
     <Link href="/weather">Worldwide Weather Explorer</Link>
     <Link href="/search">Web Search</Link>
    </div>
   </section>
   <div className="flex items-start gap-2 px-2 text-xs text-slate-500">
    <ShieldAlert size={16} className="shrink-0"/>
    <p>Research/development assistant. Do not use as a certified defence or surveillance decision system.</p>
   </div>
  </aside>
 </div>;
}
