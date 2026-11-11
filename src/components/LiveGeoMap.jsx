'use client';
import {useEffect,useRef,useState} from 'react';

const DOMAINS=[
  {id:'flights',name:'Aircraft',color:'#00d4ff'},
  {id:'earthquakes',name:'Earthquakes',color:'#f97316'},
  {id:'events',name:'Natural events',color:'#a3e635'},
  {id:'weather',name:'Weather',color:'#fbbf24'},
];
const REGION={
  bengaluru:[12.9716,77.5946],london:[51.47,-0.4543],
  singapore:[1.3644,103.9915],newyork:[40.6413,-73.7781],
  dubai:[25.2532,55.3657],
};
const fmt=x=>x?new Date(x).toLocaleString():'Unspecified';
function initLeaflet(){
  if(window.L)return Promise.resolve(window.L);
  if(window.__asuraLeaflet)return window.__asuraLeaflet;
  window.__asuraLeaflet=new Promise((resolve,reject)=>{
    const css=document.createElement('link');
    css.rel='stylesheet';css.href='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
    css.integrity='sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    css.crossOrigin='anonymous';document.head.appendChild(css);
    const script=document.createElement('script');
    script.src='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
    script.integrity='sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin='anonymous';
    script.onload=()=>resolve(window.L);script.onerror=()=>reject(new Error('Mapping library could not be loaded'));
    document.head.appendChild(script);
  });
  return window.__asuraLeaflet;
}
export default function LiveGeoMap({region='bengaluru'}){
  const target=useRef(null), mapRef=useRef(null), tilesRef=useRef({}), markersRef=useRef(null);
  const [mode,setMode]=useState('street');
  const [layers,setLayers]=useState(['flights','earthquakes','events','weather']);
  const [responses,setResponses]=useState({});
  const [selected,setSelected]=useState(null);
  const [error,setError]=useState('');
  const [round,setRound]=useState(0);
  useEffect(()=>{
    let mounted=true;
    initLeaflet().then(L=>{
      if(!mounted||!target.current||mapRef.current)return;
      const map=L.map(target.current,{worldCopyJump:true,zoomControl:true}).setView(REGION[region]||REGION.bengaluru,6);
      mapRef.current=map;
      tilesRef.current={
        street:L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
          maxZoom:19,attribution:'© OpenStreetMap contributors'}),
        satellite:L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{
          maxZoom:19,attribution:'Imagery © Esri, Vantor, Earthstar Geographics, GIS User Community'}),
      };
      tilesRef.current.street.addTo(map);
      markersRef.current=L.layerGroup().addTo(map);
      setTimeout(()=>{if(mounted)map.invalidateSize();},100);
    }).catch(e=>{if(mounted)setError(e.message);});
    return()=>{mounted=false;mapRef.current?.remove();mapRef.current=null;markersRef.current=null;};
  },[]);
  useEffect(()=>{const m=mapRef.current;if(m)m.flyTo(REGION[region]||REGION.bengaluru,Math.max(m.getZoom(),7),{duration:0.6});},[region]);
  useEffect(()=>{
    let active=true;
    const load=()=>Promise.all(DOMAINS.map(async source=>{
      try{
        const response=await fetch('/api/live/'+source.id+(source.id==='flights'?'?region='+region:''),{cache:'no-store'});
        const result=await response.json();
        if(active)setResponses(p=>({...p,[source.id]:result}));
      }catch(e){if(active)setResponses(p=>({...p,[source.id]:{success:false,error:e.message,records:[]} ]}));}
    }));
    load();
    const timer=setInterval(load,90000);
    return()=>{active=false;clearInterval(timer);};
  },[region,round]);
  useEffect(()=>{
    const map=mapRef.current;
    if(!map)return;
    const tiles=tilesRef.current;
    for(const key of ['street','satellite'])if(map.hasLayer(tiles[key]))map.removeLayer(tiles[key]);
    tiles[mode].addTo(map);
    if(markersRef.current)markersRef.current.bringToFront?.();
  },[mode,error]);
  useEffect(()=>{
    const L=window.L;
    if(!L||!markersRef.current)return;
    const layer=markersRef.current;layer.clearLayers();
    DOMAINS.filter(s=>layers.includes(s.id)).forEach(s=>{
      (responses[s.id]?.success?responses[s.id].records:[]).filter(r=>Number.isFinite(r.lat)&&Number.isFinite(r.lon)).slice(0,300).forEach(r=>{
        const marker=L.circleMarker([r.lat,r.lon],{
          radius:s.id==='flights'?5:6,color:'#111827',weight:1.5,
          fillColor:s.color,fillOpacity:0.93
        });
        const details=document.createElement('div');
        details.style.maxWidth='280px';
        const title=document.createElement('strong');title.textContent=r.title;details.appendChild(title);
        for(const line of [
          s.name+' · '+r.source,
          r.description||'',
          r.altitudeFeet!=null?'Altitude '+Math.round(r.altitudeFeet)+' ft':'',
          r.speedKnots!=null?'Speed '+Math.round(r.speedKnots)+' knots':'',
          'Observed: '+fmt(r.observedAt)
        ].filter(Boolean)){
          const p=document.createElement('p');p.style.margin='4px 0';p.textContent=line;details.appendChild(p);
        }
        if(r.url?.startsWith('https://')){
          const a=document.createElement('a');a.href=r.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Original data source';details.appendChild(a);
        }
        marker.bindPopup(details);
        marker.on('click',()=>setSelected({record:r,domain:s.name}));
        marker.addTo(layer);
      });
    });
  },[responses,layers,error]);
  const count=DOMAINS.reduce((n,s)=>n+(layers.includes(s.id)&&responses[s.id]?.success?responses[s.id].records?.length||0:0),0);
  return <section className="defense-card overflow-hidden">
    <div className="p-4 border-b space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-semibold text-slate-900">ASURA Geographic Explorer</h2>
        <p className="text-xs text-slate-600">{count} reported positions · Satellite imagery is not live video</p></div>
        <div className="flex gap-2">
          <button type="button" onClick={()=>setMode('street')} className={'rounded px-3 py-2 text-xs border '+(mode==='street'?'bg-slate-900 text-white':'bg-white')}>Street map</button>
          <button type="button" onClick={()=>setMode('satellite')} className={'rounded px-3 py-2 text-xs border '+(mode==='satellite'?'bg-slate-900 text-white':'bg-white')}>Satellite map</button>
          <button type="button" onClick={()=>setRound(x=>x+1)} className="rounded px-3 py-2 text-xs border">Refresh</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {DOMAINS.map(s=><label key={s.id} className="flex items-center gap-2 text-xs text-slate-700">
          <input type="checkbox" checked={layers.includes(s.id)} onChange={e=>setLayers(x=>e.target.checked?[...x,s.id]:x.filter(y=>y!==s.id))}/>
          <span style={{background:s.color}} className="w-2.5 h-2.5 rounded-full"/>{s.name}
          <span className="text-slate-500">({responses[s.id]?.success?responses[s.id].count:responses[s.id]?'offline':'…'})</span>
        </label>)}
      </div>
    </div>
    {error&&<p role="alert" className="p-4 text-sm text-red-700">Map unavailable: {error}</p>}
    <div ref={target} className="w-full bg-slate-900" style={{height:500}} aria-label="Interactive geographic map with satellite and street basemap controls"/>
    <div className="p-3 text-xs text-slate-600 flex flex-wrap justify-between gap-2">
      <span>Satellite basemap: Esri World Imagery · Use requires adherence to provider licensing and attribution</span>
      <span>Positions are from independent public reports, not objects detected in the imagery</span>
    </div>
    {selected&&<div className="p-4 border-t text-sm space-y-1">
      <div className="font-semibold">{selected.record.title}</div>
      <div className="text-xs text-slate-600">{selected.domain} · {selected.record.source} · {fmt(selected.record.observedAt)}</div>
      {selected.record.description&&<div className="text-xs">{selected.record.description}</div>}
      <div className="text-xs text-slate-500">{selected.record.lat.toFixed(5)}°, {selected.record.lon.toFixed(5)}°</div>
    </div>}
  </section>;
}
