'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {
 Search,Globe2,MapPin,RefreshCw,Thermometer,Cloud,Wind,Droplets,
 Eye,Compass,Sun,ExternalLink,AlertTriangle,Clock,CloudRain,Map,
 CheckCircle2,LocateFixed,ChevronDown
} from 'lucide-react';

const PRESETS=[
 {q:'Bengaluru',country:'IN',label:'Bengaluru, India'},
 {q:'New York',country:'US',label:'New York, USA'},
 {q:'Tokyo',country:'JP',label:'Tokyo, Japan'},
 {q:'London',country:'GB',label:'London, UK'},
 {q:'Nairobi',country:'KE',label:'Nairobi, Kenya'},
 {q:'São Paulo',country:'BR',label:'São Paulo, Brazil'},
];
const dateTime=at=>{
 if(!at)return 'Not reported';
 const d=new Date(at);return Number.isFinite(d.getTime())?
  d.toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'UTC'})+' UTC':'Unknown';
};
const dateOnly=date=>{
 if(!date)return '—';
 const d=new Date(date+'T12:00:00Z');
 return Number.isFinite(d.getTime())?
  d.toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short',timeZone:'UTC'}):date;
};
const number=(v,suffix='',digits=0)=>typeof v==='number'&&Number.isFinite(v)?v.toFixed(digits)+suffix:'Not available';
const currentCondition=(data)=>data?.description?data.description.charAt(0).toUpperCase()+data.description.slice(1):'Not reported';
function WeatherMetric({icon:Icon,label,value,detail}){
 return <div className="border border-slate-200 rounded-lg p-3 flex gap-3 bg-white">
  <Icon size={20} className="shrink-0 text-sky-700 mt-1"/>
  <div className="min-w-0">
   <p className="text-xs text-slate-500">{label}</p>
   <p className="font-semibold text-slate-900 text-lg">{value}</p>
   {detail&&<p className="text-[11px] text-slate-500">{detail}</p>}
  </div>
 </div>;
}
function Chart({items}){
 const data=items.filter(x=>Number.isFinite(x.temperatureC)).slice(0,16);
 if(data.length<2)return null;
 const lo=Math.floor(Math.min(...data.map(x=>x.temperatureC))-3);
 const hi=Math.ceil(Math.max(...data.map(x=>x.temperatureC))+3);
 const y=t=>35+(1-(t-lo)/Math.max(1,hi-lo))*123;
 const x=i=>40+i*(690/Math.max(1,data.length-1));
 const path=data.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+','+y(v.temperatureC).toFixed(1)).join(' ');
 return <div className="border rounded-lg p-3 bg-white space-y-2">
  <h3 className="text-sm font-semibold">Temperature across forecast intervals</h3>
  <svg viewBox="0 0 775 222" width="100%" role="img"
   aria-label={'Forecast temperature chart, from '+number(data[0].temperatureC,' °C',1)+' to '+number(data[data.length-1].temperatureC,' °C',1)}>
   {[0,1,2,3].map(i=><g key={i}>
     <line x1="40" x2="731" y1={40+i*39} y2={40+i*39} stroke="#e2e8f0" strokeWidth="1"/>
     <text x="32" y={44+i*39} fontSize="12" textAnchor="end" fill="#64748b">{Math.round(hi-i*(hi-lo)/3)}°</text>
   </g>)}
   <path d={path} fill="none" stroke="#0284c7" strokeWidth="3" strokeLinejoin="round"/>
   {data.map((v,i)=><g key={v.at}>
    <circle cx={x(i)} cy={y(v.temperatureC)} r="3.3" fill="#0284c7"/>
    {i%3===0&&<text x={x(i)} y="205" textAnchor="middle" fill="#64748b" fontSize="10">
     {v.localTime?.slice(5,10)+' '+v.localTime?.slice(11,16)}
    </text>}
   </g>)}
  </svg>
  <p className="text-xs text-slate-500">Forecast model temperatures, sampled every 3 hours. Labels use the provider's location UTC offset.</p>
 </div>;
}
function loadLeaflet(){
 if(window.L)return Promise.resolve(window.L);
 if(window.__asuraWeatherLeaflet)return window.__asuraWeatherLeaflet;
 window.__asuraWeatherLeaflet=new Promise((resolve,reject)=>{
  const css=document.createElement('link');css.rel='stylesheet';
  css.href='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
  css.crossOrigin='anonymous';document.head.appendChild(css);
  const sc=document.createElement('script');
  sc.src='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
  sc.crossOrigin='anonymous';
  sc.onload=()=>resolve(window.L);
  sc.onerror=()=>reject(new Error('World map library unavailable'));
  document.head.appendChild(sc);
 }).catch(e=>{window.__asuraWeatherLeaflet=null;throw e});
 return window.__asuraWeatherLeaflet;
}
function WeatherMap({selected,onChoose}){
 const dom=useRef(null),map=useRef(null),marker=useRef(null);
 const onChooseRef=useRef(onChoose);
 const [error,setError]=useState('');
 useEffect(()=>{onChooseRef.current=onChoose},[onChoose]);
 useEffect(()=>{
  let active=true;
  loadLeaflet().then(L=>{
   if(!active||!dom.current||map.current)return;
   const m=L.map(dom.current,{worldCopyJump:true,zoomControl:true}).setView([20,0],2,{animate:false});
   map.current=m;
   L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:18,attribution:'© OpenStreetMap contributors',
   }).addTo(m);
   m.on('click',e=>{
    const lat=e.latlng?.lat,lon=e.latlng?.lng;
    if(Number.isFinite(lat)&&Number.isFinite(lon))
     onChooseRef.current({lat:Number(lat.toFixed(4)),lon:Number(lon.toFixed(4)),
      name:'Map-selected coordinates',label:'Map-selected point',state:'',country:''});
   });
   setTimeout(()=>{if(active&&map.current)m.invalidateSize({pan:false,animate:false})},150);
  }).catch(e=>{if(active)setError(e.message)});
  return()=>{active=false;map.current?.remove();map.current=null;marker.current=null};
 },[]);
 useEffect(()=>{
  const L=window.L,m=map.current;
  if(!L||!m||!selected)return;
  if(marker.current)m.removeLayer(marker.current);
  marker.current=L.marker([selected.lat,selected.lon]).addTo(m);
  m.setView([selected.lat,selected.lon],Math.max(m.getZoom(),8),{animate:false});
 },[selected]);
 return <div className="space-y-2">
  <div ref={dom} className="w-full rounded border bg-slate-100" style={{height:320}}
   aria-label="Interactive worldwide map. Click to request point weather at a coordinate."/>
  {error&&<p role="alert" className="text-xs text-amber-800">{error}</p>}
  <p className="text-xs text-slate-500">Select any location worldwide by clicking the map. Weather is calculated for that exact point, not averaged over the surrounding state.</p>
 </div>;
}

export default function WeatherWorkspace(){
 const [search,setSearch]=useState('');
 const [stateHint,setStateHint]=useState('');
 const [country,setCountry]=useState('');
 const [countries,setCountries]=useState([]);
 const [locations,setLocations]=useState([]);
 const [querying,setQuerying]=useState(false);
 const [searchError,setSearchError]=useState('');
 const [selected,setSelected]=useState(null);
 const [report,setReport]=useState(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [revision,setRevision]=useState(0);
 const [mapVisible,setMapVisible]=useState(false);
 const [coords,setCoords]=useState({lat:'',lon:''});
 const searchRef=useRef(0);
 useEffect(()=>{
  let active=true;
  fetch('/api/cameras/geography',{cache:'force-cache'})
   .then(r=>r.json()).then(d=>{if(active&&d.countries?.length>150)setCountries(d.countries)})
   .catch(()=>{});
  return()=>{active=false};
 },[]);
 const onSearch=async(custom)=>{
  const q=(custom?.q??search).trim();
  const countryCode=(custom?.country??country).trim().toUpperCase();
  const hint=(custom?.stateHint??stateHint).trim();
  if(q.length<2){setSearchError('Enter a city, district, state or place name (at least 2 characters).');return}
  const seq=++searchRef.current;
  setQuerying(true);setSearchError('');setLocations([]);
  if(custom?.q!==undefined){setSearch(custom.q);setCountry(countryCode);setStateHint('')}
  try{
   const p=new URLSearchParams({q:[q,hint].filter(Boolean).join(','),country:countryCode});
   const r=await fetch('/api/weather/search?'+p,{cache:'no-store'});
   const d=await r.json();
   if(seq!==searchRef.current)return;
   if(!r.ok||!d.success)throw new Error(d.error||'Geocoding provider unavailable');
   setLocations(d.locations||[]);
   if(!d.locations?.length)setSearchError('No matching location returned. Try another spelling, country code, or nearby city.');
  }catch(e){if(seq===searchRef.current)setSearchError(e.message)}
  finally{if(seq===searchRef.current)setQuerying(false)}
 };
 const choose=place=>{
  if(!Number.isFinite(place?.lat)||!Number.isFinite(place?.lon))return;
  setSelected({...place,label:place.label||place.name||'Selected point'});
  // Never show the previous place's weather under the newly selected place.
  setReport(null);setLoading(true);setError('');setLocations([]);
  setCoords({lat:String(place.lat),lon:String(place.lon)});
 };
 useEffect(()=>{
  if(!selected)return;
  let active=true;const controller=new AbortController();
  const run=async()=>{
   setLoading(true);setError('');
   try{
    const p=new URLSearchParams({lat:String(selected.lat),lon:String(selected.lon),
     label:selected.label||selected.name||'Selected point',state:selected.state||'',country:selected.country||''});
    const r=await fetch('/api/weather?'+p,{signal:controller.signal,cache:'no-store'});
    const data=await r.json();
    if(!active)return;
    if(!r.ok||!data.success)throw new Error(data.error||'Weather provider unavailable');
    setReport(data);
   }catch(e){if(active&&e.name!=='AbortError'){setError(e.message);setReport(null)}}
   finally{if(active)setLoading(false)}
  };
  run();const timer=setInterval(run,10*60*1000);
  return()=>{active=false;controller.abort();clearInterval(timer)};
 },[selected,revision]);
 const now=report?.current;
 const hourly=report?.hourly||[];
 const daily=report?.daily||[];
 const localDateTime=(v)=>{
  if(!v)return 'Not reported';
  const offset=Number(report?.timezoneOffsetSeconds)||0;
  const ms=Date.parse(v);
  return Number.isFinite(ms)?new Date(ms+offset*1000).toISOString().slice(0,16).replace('T',' ')+' '+(report.timezoneName||'local offset'):'Not reported';
 };
 const agentLink=selected?'/agent?'+new URLSearchParams({
  weatherLocation:selected.label||selected.name||'Selected coordinates',
  weatherLat:String(selected.lat),weatherLon:String(selected.lon)
 }).toString():'/agent';
 return <div className="space-y-5">
  <section className="defense-card p-5 space-y-4">
   <div className="flex flex-wrap gap-3 justify-between items-start">
    <div>
     <h2 className="font-bold text-lg flex gap-2 items-center"><Globe2 size={20} className="text-sky-700"/> Worldwide Weather Explorer</h2>
     <p className="text-sm text-slate-600">Search a city, town, district, state, province, or select a coordinate anywhere on Earth.</p>
    </div>
    <button type="button" onClick={()=>setMapVisible(v=>!v)}
     className="border rounded px-3 py-2 text-xs flex items-center gap-2"><Map size={15}/>{mapVisible?'Hide world map':'Choose from world map'}</button>
   </div>
   <form onSubmit={e=>{e.preventDefault();onSearch()}} className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(140px,1fr)_minmax(140px,1fr)_auto] gap-3 items-end">
    <label className="text-xs font-medium space-y-1">
     <span className="block">City / district / state / place</span>
     <div className="flex border rounded overflow-hidden">
      <Search size={17} className="m-2.5 text-slate-400 shrink-0"/>
      <input value={search} onChange={e=>setSearch(e.target.value)} maxLength={90}
       placeholder="e.g. Mysuru, Ontario, Paris…" className="w-full py-2 pr-2 outline-none text-sm"/>
     </div>
    </label>
    <label className="text-xs font-medium space-y-1">
     <span className="block">State / province (optional)</span>
     <input value={stateHint} onChange={e=>setStateHint(e.target.value)} maxLength={60}
      placeholder="Karnataka, Texas…" className="block w-full rounded border px-3 py-2 text-sm"/>
    </label>
    <label className="text-xs font-medium space-y-1">
     <span className="block">Country</span>
     {countries.length>0?
      <select value={country} onChange={e=>setCountry(e.target.value)}
       className="block w-full rounded border bg-white px-3 py-2 text-sm">
       <option value="">All countries</option>
       {countries.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}
      </select>:
      <input value={country} onChange={e=>setCountry(e.target.value.toUpperCase().slice(0,2))}
       placeholder="ISO country code (IN)" className="block w-full rounded border px-3 py-2 text-sm"/>}
    </label>
    <button disabled={querying} type="submit"
     className="bg-sky-700 text-white rounded px-4 py-2 text-sm disabled:opacity-50">
     {querying?'Finding…':'Find location'}
    </button>
   </form>
   <div className="flex flex-wrap gap-2">
    {PRESETS.map(p=><button key={p.label} type="button" onClick={()=>onSearch(p)}
      className="text-xs px-3 py-1.5 border rounded-full hover:bg-sky-50">{p.label}</button>)}
   </div>
   {searchError&&<p role="alert" className="rounded p-3 bg-amber-50 text-sm text-amber-900">{searchError}</p>}
   {locations.length>0&&<div className="rounded border divide-y max-h-64 overflow-y-auto">
    <p className="text-xs text-slate-500 font-semibold p-2">Choose the correct result — coordinates and administrative regions are provider-supplied</p>
    {locations.map((place,i)=><button type="button" key={place.id+'-'+i} onClick={()=>choose(place)}
      className="w-full flex justify-between gap-3 items-center p-3 text-left hover:bg-sky-50">
      <div className="min-w-0">
       <p className="text-sm font-medium">{place.name}</p>
       <p className="text-xs text-slate-600">{[place.state,place.country].filter(Boolean).join(' / ')||'No administrative label provided'}</p>
      </div>
      <span className="text-xs text-slate-500 whitespace-nowrap">{place.lat.toFixed(3)}°, {place.lon.toFixed(3)}°</span>
    </button>)}
   </div>}
   <details className="border rounded px-3 py-2 text-sm">
    <summary className="cursor-pointer font-medium text-xs">Use exact latitude and longitude instead</summary>
    <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={e=>{
     e.preventDefault();
     const lat=Number(coords.lat),lon=Number(coords.lon);
     if(!coords.lat.trim()||!coords.lon.trim()||!Number.isFinite(lat)||!Number.isFinite(lon)||
        Math.abs(lat)>90||Math.abs(lon)>180){setSearchError('Invalid latitude / longitude');return}
     choose({lat,lon,name:'Coordinates',label:'Point '+lat.toFixed(4)+', '+lon.toFixed(4),state:'',country:''});
    }}>
     <label className="text-xs">Latitude
      <input value={coords.lat} onChange={e=>setCoords(x=>({...x,lat:e.target.value}))}
       placeholder="-90 to 90" className="block rounded border p-2 text-sm"/>
     </label>
     <label className="text-xs">Longitude
      <input value={coords.lon} onChange={e=>setCoords(x=>({...x,lon:e.target.value}))}
       placeholder="-180 to 180" className="block rounded border p-2 text-sm"/>
     </label>
     <button type="submit" className="bg-slate-900 text-white rounded px-3 py-2 text-xs">Show point weather</button>
    </form>
   </details>
   {mapVisible&&<WeatherMap selected={selected} onChoose={choose}/>}
  </section>

  {selected&&<section className="defense-card p-5 space-y-4">
   <div className="flex flex-wrap items-start justify-between gap-3">
    <div>
     <h2 className="text-xl font-bold text-slate-900">{selected.label||selected.name||'Selected coordinate'}</h2>
     <p className="text-sm text-slate-600 flex items-center gap-1">
      <MapPin size={14}/>{selected.lat.toFixed(4)}°, {selected.lon.toFixed(4)}° · Single-coordinate weather</p>
    </div>
    <div className="flex flex-wrap gap-2">
     <button type="button" onClick={()=>setRevision(x=>x+1)} className="border rounded px-3 py-2 text-xs flex gap-2 items-center">
      <RefreshCw size={14}/> Refresh weather
     </button>
     <Link href={agentLink} className="bg-slate-900 text-white rounded px-3 py-2 text-xs">
      Ask DEVASHRI
     </Link>
    </div>
   </div>
   {loading&&<p role="status" className="text-sm flex gap-2 items-center text-sky-700"><RefreshCw className="animate-spin" size={15}/> Requesting weather from OpenWeather…</p>}
   {error&&<p role="alert" className="rounded bg-amber-50 text-amber-900 text-sm p-3">{error} · No dummy weather has been substituted.</p>}
   {report&&<div className="space-y-5">
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500 border-b pb-3">
     <span>Provider: <strong>OpenWeather</strong></span>
     <span>Retrieved: {dateTime(report.retrievedAt)}</span>
     <span>Observed/provider time: {dateTime(now?.observedAt)}</span>
     <span>Forecast: 5 days at 3-hour steps, where available</span>
     {report.timezoneName&&<span>Location offset: {report.timezoneName}</span>}
    </div>
    {report.errors?.length>0&&<div role="status" className="rounded p-3 bg-amber-50 text-sm text-amber-900">
     Some provider data is unavailable: {report.errors.join('; ')}
    </div>}
    {now?<div className="space-y-3">
     {now.stale&&<p className="text-sm bg-amber-50 text-amber-900 rounded p-3">
      Warning: the provider observation is {now.ageMinutes} minutes old. It must not be treated as live/current conditions.
     </p>}
     <div className="flex flex-wrap gap-4 items-center p-4 rounded-lg bg-gradient-to-r from-sky-50 to-slate-50 border">
      <Cloud size={38} className="text-sky-700"/>
      <div>
       <p className="text-4xl font-bold tabular-nums">{number(now.temperatureC,'°C',1)}</p>
       <p className="text-sm font-medium">{currentCondition(now)}</p>
      </div>
      <div className="md:ml-auto text-xs text-slate-600">
       <p>Feels like {number(now.feelsLikeC,'°C',1)}</p>
       <p>Provider observation age: {now.ageMinutes} min</p>
       <p>Location time: {localDateTime(now.observedAt)}</p>
      </div>
     </div>
     <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <WeatherMetric icon={Droplets} label="Relative humidity" value={number(now.humidityPercent,'%',0)}/>
      <WeatherMetric icon={Wind} label="Wind speed" value={number(now.windKmh,' km/h',1)}
       detail={Number.isFinite(now.windDegrees)?'Bearing '+now.windDegrees+'°':''}/>
      <WeatherMetric icon={Compass} label="Atmospheric pressure (provider)" value={number(now.pressureHpa,' hPa',0)}/>
      <WeatherMetric icon={Eye} label="Visibility" value={Number.isFinite(now.visibilityMeters)?number(now.visibilityMeters/1000,' km',1):'Not available'}/>
      <WeatherMetric icon={Cloud} label="Cloud cover" value={number(now.cloudCoverPercent,'%',0)}/>
      <WeatherMetric icon={Wind} label="Wind gusts" value={number(now.gustKmh,' km/h',1)}/>
      <WeatherMetric icon={Sun} label="Sunrise (location)" value={localDateTime(now.sunriseAt).slice(11)}/>
      <WeatherMetric icon={Sun} label="Sunset (location)" value={localDateTime(now.sunsetAt).slice(11)}/>
     </div>
    </div>:<p className="text-sm bg-amber-50 p-3 rounded">Current weather is unavailable. The available forecast below is not an observed measurement.</p>}
    {hourly.length>0&&<>
     <Chart items={hourly}/>
     <div className="space-y-2">
      <h3 className="text-base font-semibold">Five-day forecast overview (may cover six local calendar dates)</h3>
      <p className="text-xs text-slate-500">Min/max are sampled from the published 3-hour predictions—not official daily extremes. Partial days have fewer samples.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
       {daily.map(day=><div key={day.date} className="rounded-lg bg-white border p-3 space-y-1">
        <p className="text-xs font-semibold">{dateOnly(day.date)}</p>
        <p className="text-sm font-semibold">{number(day.sampledMaxC,'°',0)} / {number(day.sampledMinC,'°',0)}</p>
        <p className="text-xs text-sky-700">Rain chance up to {number(day.maxPrecipitationProbabilityPercent,'%',0)}</p>
        <p className="text-xs text-slate-500">{day.weatherDescription}</p>
        {day.partial&&<span className="text-[10px] text-amber-800">Partial intervals</span>}
       </div>)}
      </div>
     </div>
     <details className="rounded border">
      <summary className="p-3 cursor-pointer font-semibold text-sm">View all 3-hour forecast intervals ({hourly.length})</summary>
      <div className="max-h-[500px] overflow-y-auto overflow-x-auto border-t">
       <table className="min-w-[720px] w-full text-left text-xs">
        <thead className="bg-slate-100 sticky top-0">
         <tr>{['Local date/time','Temp','Feels like','Humidity','Rain probability','Wind','Condition'].map(x=><th key={x} className="p-2 border-b">{x}</th>)}</tr>
        </thead>
        <tbody>{hourly.map(h=><tr key={h.at} className="even:bg-slate-50">
         <td className="p-2 whitespace-nowrap">{h.localTime?.replace('T',' ')}</td>
         <td className="p-2">{number(h.temperatureC,'°C',1)}</td>
         <td className="p-2">{number(h.feelsLikeC,'°C',1)}</td>
         <td className="p-2">{number(h.humidityPercent,'%',0)}</td>
         <td className="p-2">{number(h.precipitationProbabilityPercent,'%',0)}</td>
         <td className="p-2">{number(h.windKmh,' km/h',0)}</td>
         <td className="p-2 capitalize">{h.description}</td>
        </tr>)}</tbody>
       </table>
      </div>
     </details>
    </>}
    <div className="space-y-2 text-xs text-slate-500 border-t pt-3">
     <p><strong>Accuracy:</strong> This represents one coordinate. Countrywide or state-wide weather varies substantially by location, terrain and elevation. Forecasts are estimates that change over time.</p>
     <p><strong>Update rate:</strong> The interface refreshes approximately every 10 minutes. OpenWeather upstream model updates are not continuous and may be slower. API rate limits apply.</p>
     <p><strong>Attribution:</strong> Weather data provided by OpenWeather.
      {' '}<a href="https://openweathermap.org/" target="_blank" rel="noopener noreferrer" className="underline text-sky-700">Provider homepage <ExternalLink size={12} className="inline"/></a></p>
    </div>
   </div>}
  </section>}
  {!selected&&<section className="defense-card p-7 text-center space-y-3">
   <Globe2 size={36} className="mx-auto text-sky-700"/>
   <h2 className="font-bold text-lg">Select anywhere in the world</h2>
   <p className="text-sm text-slate-600 max-w-lg mx-auto">
    Search a place and choose its exact administrative result, or open the world map and click a coordinate. No city is assumed from your browser or account.
   </p>
  </section>}
 </div>;
}
