'use client';
import {useEffect,useState} from 'react';

const fmt=x=>x&&!Number.isNaN(Date.parse(x))?new Date(x).toLocaleString():'Not reported';
const code=a=>a?.icao||a?.iata||a?.id||'';
const dispatch=detail=>window.dispatchEvent(new CustomEvent('asura:map-route',{detail}));

function AirportPicker({title,value,onChange}){
 const [q,setQ]=useState('');
 const [data,setData]=useState([]);
 const [error,setError]=useState('');
 useEffect(()=>{
  if(q.trim().length<2){setData([]);return;}
  let live=true;
  const t=setTimeout(async()=>{
   try{
    const r=await fetch('/api/airports?limit=12&q='+encodeURIComponent(q));
    const d=await r.json();
    if(live){setData(d.airports||[]);setError(d.success?'':d.error);}
   }catch(e){if(live)setError(e.message);}
  },350);
  return()=>{live=false;clearTimeout(t);};
 },[q]);
 return <div className="relative min-w-0">
  <div className="text-xs font-semibold mb-1">{title}</div>
  {value?<div className="border rounded p-3 text-xs bg-slate-50 flex justify-between gap-2">
    <span><b>{value.iata||value.icao||value.id}</b> · {value.name}<span className="block text-slate-500">{value.city}, {value.country}</span></span>
    <button type="button" onClick={()=>{onChange(null);setQ('');}} className="text-sky-700 underline">Change</button>
  </div>:<>
   <input aria-label={title} value={q} onChange={e=>setQ(e.target.value)} placeholder="Search code, city or airport…" className="border rounded p-3 text-sm w-full"/>
   {error&&<p className="text-xs text-amber-800">{error}</p>}
   {!!data.length&&<div className="absolute top-full z-30 w-full max-h-64 overflow-y-auto bg-white shadow-xl border rounded">
    {data.map(a=><button type="button" key={a.id} onClick={()=>{onChange(a);setData([]);setQ('');}} className="w-full border-b p-3 text-left text-xs hover:bg-sky-50">
      <b>{a.iata||a.icao||a.id}</b> — {a.name}<span className="block text-slate-500">{a.city} · {a.country} · {a.type.replaceAll('_',' ')}</span>
    </button>)}
   </div>}
  </>}
 </div>;
}

const BOARD_TYPES=[
 ['departures','Recently departed'],['arrivals','Recently landed'],
 ['scheduled_departures','Scheduled to depart'],['scheduled_arrivals','Scheduled to arrive'],
 ['route','Flights between selected airports']
];

export default function AirportOperationsWorkspace(){
 const [origin,setOrigin]=useState(null),[destination,setDestination]=useState(null);
 const [directory,setDirectory]=useState({airports:[],loading:true,matches:0,totalAirports:null});
 const [findAirport,setFindAirport]=useState(''),[offset,setOffset]=useState(0);
 const [boardType,setBoardType]=useState('departures'),[board,setBoard]=useState(null),[loadingBoard,setLoadingBoard]=useState(false);
 const [nearby,setNearby]=useState(null);
 const [lookupMode,setLookupMode]=useState('callsign'),[lookupQuery,setLookupQuery]=useState('');
 const [tracked,setTracked]=useState(null),[trace,setTrace]=useState([]),[tracking,setTracking]=useState(false);
 const [trackError,setTrackError]=useState(''),[selectedFlight,setSelectedFlight]=useState(null),[providerTrace,setProviderTrace]=useState([]);
 const [trackLoading,setTrackLoading]=useState(false);
 useEffect(()=>{
  let alive=true;
  const timer=setTimeout(async()=>{
   try{
    const r=await fetch('/api/airports?limit=30&offset='+offset+'&q='+encodeURIComponent(findAirport));
    const d=await r.json();
    if(alive)setDirectory({...d,loading:false,error:d.success?'':d.error});
   }catch(e){if(alive)setDirectory(p=>({...p,loading:false,error:e.message}));}
  },findAirport?350:0);
  setDirectory(p=>({...p,loading:true}));
  return()=>{alive=false;clearTimeout(timer);};
 },[findAirport,offset]);

 const chooseOrigin=a=>{
  setOrigin(a);setBoard(null);setNearby(null);
  if(a)dispatch({focusAirport:a,origin:a,destination,flightPoints:trace,tracking:tracked});
 };
 const chooseDestination=a=>{
  setDestination(a);
  dispatch({origin,destination:a,flightPoints:trace,tracking:tracked});
 };
 useEffect(()=>{
  dispatch({origin,destination,flightPoints:providerTrace.length?providerTrace:trace,
    trackProvider:providerTrace.length?'FlightAware reported history':'Public ADS-B observations collected while this page is open',
    tracking:tracked?.position||tracked});
 },[origin,destination,trace,tracked,providerTrace]);

 useEffect(()=>{
  if(!origin)return;
  let alive=true;
  const load=async()=>{
   try{
    const u='/api/live/flights?lat='+origin.lat.toFixed(3)+'&lon='+origin.lon.toFixed(3);
    const r=await fetch(u,{cache:'no-store'}),d=await r.json();
    if(alive)setNearby(d);
   }catch(e){if(alive)setNearby({success:false,error:e.message});}
  };
  load();const timer=setInterval(load,60000);
  return()=>{alive=false;clearInterval(timer);};
 },[origin]);

 const loadBoard=async()=>{
  if(!origin)return;
  if(boardType==='route'&&!destination){setBoard({success:false,error:'Choose the destination airport first.'});return;}
  setLoadingBoard(true);setBoard(null);
  try{
   const qs=new URLSearchParams({airport:code(origin),board:boardType});
   if(boardType==='route')qs.set('destination',code(destination));
   const r=await fetch('/api/airports/board?'+qs,{cache:'no-store'});
   setBoard(await r.json());
  }catch(e){setBoard({success:false,error:e.message});}
  finally{setLoadingBoard(false);}
 };

 const addPoint=(record)=>{
  if(!record||!Number.isFinite(record.lat)||!Number.isFinite(record.lon))return;
  const point={lat:record.lat,lon:record.lon,observedAt:record.observedAt};
  setTrace(prev=>{
   if(prev.some(x=>x.observedAt===point.observedAt))return prev;
   return [...prev,point].slice(-500);
  });
  setTracked(record);
 };
 const poll=async(mode,q)=>{
  try{
   const r=await fetch('/api/aircraft/find?'+new URLSearchParams({mode,q}),{cache:'no-store'});
   const d=await r.json();
   if(!d.success)throw new Error(d.error);
   if(!d.records?.length)throw new Error('No recent live position from this receiver network.');
   addPoint(d.records[0]);setTrackError('');
  }catch(e){setTrackError(e.message||'Lookup unavailable');}
 };
 const startTrack=async(event)=>{
  event.preventDefault();
  const q=lookupQuery.trim().toUpperCase();
  if(!q)return;
  setTrace([]);setProviderTrace([]);setTracked(null);setTrackError('');
  setTracking(true);
  await poll(lookupMode,q);
 };
 useEffect(()=>{
  if(!tracking||!lookupQuery.trim())return;
  const timer=setInterval(()=>poll(lookupMode,lookupQuery.trim().toUpperCase()),60000);
  return()=>clearInterval(timer);
 },[tracking,lookupMode,lookupQuery]);

 const selectNearby=record=>{
  setLookupMode('icao');setLookupQuery(record.icao24||record.id);
  setTrace([]);setTracked(record);setSelectedFlight(null);setProviderTrace([]);
  setTracking(true);addPoint(record);
 };
 const selectBoardFlight=async f=>{
  setSelectedFlight(f);setProviderTrace([]);setTrackError('');setTrackLoading(true);
  setTracking(false);
  try{
   if(!f.faFlightId)throw new Error('Flight record does not provide a unique FlightAware flight ID.');
   const r=await fetch('/api/flights/operations?'+new URLSearchParams({track:'true',id:f.faFlightId}));
   const d=await r.json();
   if(!d.success)throw new Error(d.error);
   setProviderTrace(d.points||[]);
  }catch(e){setTrackError('Flight history: '+e.message);}
  finally{setTrackLoading(false);}
 };

 return <div className="space-y-6">
  <section className="defense-card p-5 space-y-4">
   <h2 className="font-semibold text-lg">Airport Search & Route Selection</h2>
   <p className="text-sm text-slate-600">Search the complete OurAirports directory. Select starting and destination airports to show a geographic reference route on the map. It does not mean a particular aircraft follows that line.</p>
   <div className="grid md:grid-cols-2 gap-3">
    <AirportPicker title="Starting airport" value={origin} onChange={chooseOrigin}/>
    <AirportPicker title="Destination airport" value={destination} onChange={chooseDestination}/>
   </div>
   <div className="flex flex-wrap gap-2">
    <button type="button" disabled={!origin} onClick={()=>dispatch({focusAirport:origin,origin,destination,flightPoints:trace,tracking:tracked})} className="bg-sky-700 text-white px-4 py-2 text-xs rounded disabled:opacity-40">Show airports and route on map</button>
    <button type="button" onClick={()=>chooseDestination(null)} className="border px-4 py-2 text-xs rounded">Clear destination</button>
   </div>
   {origin&&<p className="text-xs text-slate-500">Selected: {origin.name} · {origin.lat.toFixed(4)}°, {origin.lon.toFixed(4)}° · {origin.scheduled?'Scheduled service listed':'Scheduled service not listed'}</p>}
  </section>

  <section className="defense-card p-5 space-y-4">
   <h3 className="font-semibold">Airport Arrivals, Departures & Nearby Aircraft</h3>
   <p className="text-xs text-slate-600">Actual takeoff/landing times, future schedules and route manifests require FlightAware AeroAPI. Live ADS-B near an airport does not establish whether an aircraft departed or landed there.</p>
   <div className="flex flex-wrap gap-2">
    {BOARD_TYPES.map(([key,name])=><button type="button" key={key} onClick={()=>{setBoardType(key);setBoard(null);}}
      className={'px-3 py-2 rounded border text-xs '+(boardType===key?'bg-slate-900 text-white':'bg-white')}>{name}</button>)}
   </div>
   <button onClick={loadBoard} disabled={!origin||loadingBoard} type="button" className="bg-slate-900 text-white px-4 py-2 rounded text-xs disabled:opacity-40">{loadingBoard?'Requesting provider…':'Load operational board'}</button>
   {board&&!board.success&&<p role="alert" className="text-xs bg-amber-50 text-amber-900 p-3 rounded">{board.error}</p>}
   {board?.success&&<>
    <p className="text-xs">{board.provider} · {board.count} flights in returned page · Retrieved {fmt(board.retrievedAt)}{board.complete?'':' · More pages exist'}</p>
    <div className="max-h-72 overflow-y-auto border rounded divide-y">
     {board.flights.map((f,i)=><button type="button" key={(f.id||i)+'_'+i} onClick={()=>selectBoardFlight(f)}
       className="text-left w-full p-3 text-xs hover:bg-sky-50">
      <b className="text-sm">{f.callsign||'Flight unavailable'}</b> · {f.origin||'?'} → {f.destination||'?'} · {f.status||'Status unavailable'}
      <span className="block text-slate-500">Scheduled off: {fmt(f.scheduledDeparture)} · Actual off: {fmt(f.actualDeparture)} · Actual on: {fmt(f.actualArrival)}{f.cancelled?' · CANCELLED':''}</span>
     </button>)}
     {!board.flights.length&&<p className="text-xs p-4">No flights returned by provider for this selection.</p>}
    </div>
   </>}
   <div className="border-t pt-3">
    <h4 className="font-semibold text-sm mb-2">Broadcasting aircraft near selected airport</h4>
    <p className="text-xs text-slate-500 mb-2">Within 250 nautical miles, regardless of origin or destination. Select a plane to follow its available position updates.</p>
    {nearby?.success?<><p className="text-xs mb-2">{nearby.count} aircraft · {nearby.provider} · {fmt(nearby.retrievedAt)}</p>
     <div className="max-h-64 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-2">
      {nearby.records.slice(0,75).map(r=><button type="button" key={r.id} onClick={()=>selectNearby(r)} className="border rounded p-2 text-left text-xs hover:bg-sky-50">
       <b>{r.title}</b> · {r.aircraftType||'Unknown type'}
       <span className="block text-slate-500">{r.altitudeFeet==null?'Altitude unreported':Math.round(r.altitudeFeet)+' ft'} · {fmt(r.observedAt)}</span>
      </button>)}
     </div></>:nearby&&<p className="text-xs text-amber-800">{nearby.error}</p>}
    {!origin&&<p className="text-xs">Select an airport to load real nearby aircraft.</p>}
   </div>
  </section>

  <section className="defense-card p-5 space-y-4">
   <h3 className="font-semibold">Select and Track a Flight</h3>
   <p className="text-xs text-slate-600">Live ADS-B tracking records observations after you start, while this page is open. A licensed FlightAware board can provide a separately identified historical flight track.</p>
   <form onSubmit={startTrack} className="flex flex-wrap gap-2">
    <select value={lookupMode} onChange={e=>setLookupMode(e.target.value)} className="border rounded p-2 text-sm" aria-label="Aircraft lookup mode">
     <option value="callsign">Callsign</option><option value="registration">Registration</option><option value="icao">ICAO hex</option>
    </select>
    <input value={lookupQuery} onChange={e=>setLookupQuery(e.target.value.toUpperCase())}
      placeholder="Search aircraft" minLength={3} maxLength={12} pattern="[A-Za-z0-9-]{3,12}" required className="border rounded p-2 text-sm flex-1 min-w-40"/>
    <button disabled={tracking} type="submit" className="bg-sky-700 rounded text-white px-4 py-2 text-sm disabled:opacity-40">Start tracking</button>
    <button type="button" disabled={!tracking} onClick={()=>setTracking(false)} className="border rounded px-4 py-2 text-sm disabled:opacity-40">Stop tracking</button>
    <button type="button" onClick={()=>{setTracking(false);setTrace([]);setTracked(null);setProviderTrace([]);setSelectedFlight(null);setTrackError('');}} className="border rounded px-4 py-2 text-sm">Clear trace</button>
   </form>
   {trackError&&<p role="alert" className="text-xs text-amber-900 bg-amber-50 p-3 rounded">{trackError}</p>}
   {tracked&&<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    {[
     ['Callsign',tracked.title],['Registration',tracked.registration||'Not reported'],['Aircraft type',tracked.aircraftType||'Not reported'],
     ['Altitude',tracked.altitudeFeet==null?'Not reported':Math.round(tracked.altitudeFeet)+' ft'],
     ['Groundspeed',tracked.speedKnots==null?'Not reported':Math.round(tracked.speedKnots)+' kt'],
     ['Heading',tracked.heading==null?'Not reported':Math.round(tracked.heading)+'°'],
     ['Latitude',tracked.lat.toFixed(5)],['Longitude',tracked.lon.toFixed(5)],
     ['Observed at',fmt(tracked.observedAt)],['Collected samples',trace.length]
    ].map(([label,value])=><div className="border rounded p-2" key={label}><div className="text-[11px] text-slate-500">{label}</div><div className="font-semibold text-sm">{value}</div></div>)}
   </div>}
   {selectedFlight&&<div className="border rounded p-3 text-xs">
    <h4 className="font-semibold text-sm">{selectedFlight.callsign||'Selected flight'} · {selectedFlight.origin||'?'} → {selectedFlight.destination||'?'}</h4>
    <p>Provider-reported status: {selectedFlight.status||'Not reported'} · ETA: {fmt(selectedFlight.estimatedArrival)}</p>
    <p>{trackLoading?'Retrieving licensed position history…':providerTrace.length?providerTrace.length+' reported historical position points':'No historical track positions loaded.'}</p>
   </div>}
   {tracking&&<p className="text-xs text-slate-500">Active polling is not always-on background tracking. Close this page to end live updates.</p>}
   {tracking&&<p className="text-xs text-slate-500">Live position updates are checked approximately every 60 seconds. {trace.length} unique observed positions collected.</p>}
  </section>

  <section className="defense-card p-5 space-y-3">
   <h3 className="font-semibold">Search All Airports Worldwide</h3>
   <p className="text-xs text-slate-600">{directory.totalAirports===null?'Loading world airport directory…':directory.totalAirports?.toLocaleString()+' recorded airport facilities'} · {directory.matches?.toLocaleString()} matching results · Public-domain OurAirports records; not a flight timetable.</p>
   <input value={findAirport} onChange={e=>{setFindAirport(e.target.value);setOffset(0);}} className="border rounded p-3 text-sm w-full" aria-label="Search all airports by city or code" placeholder="City, airport name, country, ICAO or IATA code…"/>
   {directory.error&&<p role="alert" className="bg-amber-50 text-xs text-amber-900 p-3">{directory.error}</p>}
   <div className="max-h-80 overflow-y-auto border rounded divide-y">
    {(directory.airports||[]).map(a=><div key={a.id} className="flex items-center justify-between gap-2 p-3">
     <span className="text-xs"><b>{a.iata||a.icao||a.id}</b> — {a.name}<span className="block text-slate-500">{a.city}, {a.country} · {a.type.replaceAll('_',' ')}</span></span>
     <button type="button" onClick={()=>{chooseOrigin(a);window.scrollTo({top:0,behavior:'smooth'});}} className="text-xs text-sky-700 underline flex-shrink-0">Select</button>
    </div>)}
   </div>
   <div className="flex gap-3 justify-between items-center text-xs">
    <button onClick={()=>setOffset(x=>Math.max(0,x-30))} disabled={offset===0||directory.loading} className="border rounded px-3 py-2 disabled:opacity-40">Previous</button>
    <span>{directory.loading?'Loading…':(offset+1)+'–'+Math.min(offset+30,directory.matches||0)+' of '+(directory.matches||0).toLocaleString()}</span>
    <button onClick={()=>setOffset(x=>x+30)} disabled={directory.loading||offset+30>=(directory.matches||0)} className="border rounded px-3 py-2 disabled:opacity-40">Next</button>
   </div>
  </section>
 </div>;
}
