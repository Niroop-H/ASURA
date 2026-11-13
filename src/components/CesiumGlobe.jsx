'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';

const VERSION='1.146.0';
const CESIUM_BASE='https://cdn.jsdelivr.net/npm/cesium@'+VERSION+'/Build/Cesium/';
const VIIRS_LAYER='VIIRS_NOAA20_CorrectedReflectance_TrueColor';
const GIBS='https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/';
const validPoint=r=>r&&Number.isFinite(r.lat)&&Number.isFinite(r.lon)&&Math.abs(r.lat)<=90&&Math.abs(r.lon)<=180;
const asDate=v=>{
  if(!v)return 'Not supplied';
  const d=new Date(v);
  return Number.isNaN(d.getTime())?'Invalid source time':d.toLocaleString();
};
const svgPlane='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 36"><path d="M16 1C13 1 14 7 14 13L2 21V25L14 22V29L9 32V35L16 33L23 35V32L18 29V22L30 25V21L18 13V6C18 2 17 1 16 1Z" fill="#20c7f4" stroke="#ffffff" stroke-width="1.6"/></svg>';
const smallPlane='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svgPlane);
const ICON_COLORS={earthquakes:'#f97316',events:'#84cc16',weather:'#facc15'};

function loadCesium(){
 if(typeof window==='undefined')return Promise.reject(new Error('Cesium requires a browser'));
 if(window.Cesium)return Promise.resolve(window.Cesium);
 if(window.__asuraCesiumPromise)return window.__asuraCesiumPromise;
 window.CESIUM_BASE_URL=CESIUM_BASE;
 window.__asuraCesiumPromise=new Promise((resolve,reject)=>{
  const css=document.createElement('link');
  css.rel='stylesheet';css.href=CESIUM_BASE+'Widgets/widgets.css';
  document.head.appendChild(css);
  const script=document.createElement('script');
  script.src=CESIUM_BASE+'Cesium.js';
  script.async=true;
  script.onload=()=>window.Cesium?resolve(window.Cesium):reject(new Error('Cesium library loaded without Cesium global'));
  script.onerror=()=>reject(new Error('CesiumJS CDN unavailable'));
  document.head.appendChild(script);
 });
 return window.__asuraCesiumPromise;
}
function makeBasemap(C,source,date){
 if(source==='street')return new C.OpenStreetMapImageryProvider({
  url:'https://tile.openstreetmap.org/',credit:'© OpenStreetMap contributors'});
 if(source==='daily'){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))throw new Error('NASA imagery date unavailable');
  return new C.UrlTemplateImageryProvider({
   url:GIBS+VIIRS_LAYER+'/default/'+date+'/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpeg',
   tilingScheme:new C.WebMercatorTilingScheme(),maximumLevel:9,
   credit:'NASA GIBS, NOAA-20 VIIRS; selected day '+date,
   hasAlphaChannel:false,
  });
 }
 return new C.UrlTemplateImageryProvider({
  url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  maximumLevel:19,
  credit:'Imagery © Esri, Vantor, Earthstar Geographics and GIS User Community; acquisition date varies',
 });
}
const toCart=(C,r,alt=0)=>C.Cartesian3.fromDegrees(r.lon,r.lat,alt);
export default function CesiumGlobe({records=[],routeOverlay=null,initialCenter=[12.9716,77.5946],onSelect=null,onViewportCenter=null}){
 const mount=useRef(null),viewerRef=useRef(null),cesiumRef=useRef(null),idLookup=useRef(new Map());
 const tileset=useRef(null),osmOverlay=useRef(null),onViewport=useRef(onViewportCenter);
 const [ready,setReady]=useState(false),[error,setError]=useState('');
 const [mode,setMode]=useState('satellite'),[catalog,setCatalog]=useState(null);
 const [imageDate,setImageDate]=useState(''),[sceneInfo,setSceneInfo]=useState('WGS84 3D globe');
 const [buildings,setBuildings]=useState(false),[terrain,setTerrain]=useState(false),
  [buildingBusy,setBuildingBusy]=useState(false),[buildingSource,setBuildingSource]=useState('none'),
  [ionStatus,setIonStatus]=useState('Checking Cesium ion access');
 const [selected,setSelected]=useState(null),[clockTick,setClockTick]=useState(Date.now());
 const planes=useMemo(()=>records.filter(r=>r.sourceType==='flights'&&validPoint(r)),[records]);
 const newestObservation=useMemo(()=>{
   const d=planes.map(r=>Date.parse(r.observedAt)).filter(Number.isFinite);
   return d.length?Math.max(...d):null;
 },[planes]);
 useEffect(()=>{onViewport.current=onViewportCenter;},[onViewportCenter]);
 useEffect(()=>{
  let active=true;
  fetch('/api/imagery/catalog',{cache:'no-store'})
   .then(r=>r.json()).then(d=>{if(active){setCatalog(d);if(d.success)setImageDate(d.preferredDate);}})
   .catch(e=>{if(active)setCatalog({success:false,error:e.message});});
  const t=setInterval(()=>setClockTick(Date.now()),10000);
  return()=>{active=false;clearInterval(t);};
 },[]);
 useEffect(()=>{
  let active=true,unregister=null;
  (async()=>{
   const C=await loadCesium();
   let publicConfig={ionEnabled:false};
   try{publicConfig=await fetch('/api/cesium/config').then(r=>r.json());}catch{}
   if(!active||!mount.current)return;
   if(publicConfig.ionEnabled&&publicConfig.publicViewerToken){
    C.Ion.defaultAccessToken=publicConfig.publicViewerToken;
    setIonStatus('Viewer-scoped Cesium ion token configured');
   } else setIonStatus('No public Cesium ion token. Approximate OSM footprint buildings are available when zoomed in.');
   const viewer=new C.Viewer(mount.current,{
    baseLayer:false,baseLayerPicker:false,
    geocoder:false,homeButton:true,navigationHelpButton:false,
    sceneModePicker:false,animation:false,timeline:false,fullscreenButton:false,
    infoBox:false,selectionIndicator:false,scene3DOnly:true,
    terrainProvider:new C.EllipsoidTerrainProvider(),
    requestRenderMode:true,maximumRenderTimeChange:60,
   });
   viewerRef.current=viewer;
   cesiumRef.current=C;
   viewer.scene.globe.depthTestAgainstTerrain=true;
   viewer.scene.globe.enableLighting=false;
   viewer.scene.fog.enabled=false;
   viewer.imageryLayers.addImageryProvider(makeBasemap(C,'satellite',null));
   viewer.camera.setView({
    destination:C.Cartesian3.fromDegrees(initialCenter[1],initialCenter[0],1100000),
    orientation:{heading:0,pitch:C.Math.toRadians(-65),roll:0},
   });
   unregister=viewer.camera.moveEnd.addEventListener(()=>{
    try{
     const middle=new C.Cartesian2(viewer.canvas.clientWidth/2,viewer.canvas.clientHeight/2);
     const picked=viewer.camera.pickEllipsoid(middle,viewer.scene.globe.ellipsoid);
     if(!picked)return;
     const geo=C.Cartographic.fromCartesian(picked);
     onViewport.current?.({lat:C.Math.toDegrees(geo.latitude),lon:C.Math.toDegrees(geo.longitude)});
    }catch{}
   });
   viewer.screenSpaceEventHandler.setInputAction(event=>{
    const target=viewer.scene.pick(event.position);
    const entity=target?.id;
    if(!entity||!idLookup.current.has(entity.id))return;
    const record=idLookup.current.get(entity.id);
    setSelected(record);
    onSelect?.(record);
   },C.ScreenSpaceEventType.LEFT_CLICK);
   if(publicConfig.ionEnabled){
    try{
     // Fail closed to ellipsoid if asset permission or quota doesn't allow world terrain.
     const t=await C.createWorldTerrainAsync({requestVertexNormals:true});
     if(active&&!viewer.isDestroyed()){viewer.terrainProvider=t;setTerrain(true);setSceneInfo('Cesium World Terrain');viewer.scene.requestRender();}
    }catch(e){if(active)setIonStatus('Cesium terrain unavailable: '+e.message);}
   }
   if(active)setReady(true);
   if(!active&&!viewer.isDestroyed())viewer.destroy();
  })().catch(e=>{if(active)setError(e.message)});
  return()=>{
   active=false;
   if(typeof unregister==='function')unregister();
   const viewer=viewerRef.current;
   if(viewer&&!viewer.isDestroyed())viewer.destroy();
   viewerRef.current=null;
   cesiumRef.current=null;
   idLookup.current.clear();
  };
 },[]);
 useEffect(()=>{
  const viewer=viewerRef.current,C=cesiumRef.current;
  if(!ready||!viewer||!C)return;
  try{
   viewer.imageryLayers.removeAll(true);
   viewer.imageryLayers.addImageryProvider(makeBasemap(C,mode,imageDate));
   viewer.scene.requestRender();
  }catch(e){setError('Imagery layer error: '+e.message);}
 },[ready,mode,imageDate]);
 useEffect(()=>{
  const viewer=viewerRef.current,C=cesiumRef.current;
  if(!ready||!viewer||!C)return;
  const ids=new Map();
  viewer.entities.removeAll();
  const maxRecords=850;
  for(const r of records.filter(validPoint).slice(0,maxRecords)){
    const name=String(r.title||r.id||'Observation');
    const id=String(r.sourceType||'event')+':'+String(r.id||name);
    const aircraft=r.sourceType==='flights';
    const position=toCart(C,r,aircraft&&Number.isFinite(r.altitudeFeet)?Math.max(0,r.altitudeFeet*.3048):0);
    const entity={
      id,
      name,
      position,
      properties:{source:r.source||'',observedAt:r.observedAt||null},
      ...(aircraft
        ?{billboard:{image:smallPlane,width:30,height:33,
            rotation:C.Math.toRadians(Number.isFinite(r.heading)?-r.heading:0),
            horizontalOrigin:C.HorizontalOrigin.CENTER,verticalOrigin:C.VerticalOrigin.CENTER,
            disableDepthTestDistance:Number.POSITIVE_INFINITY}}
        :{point:{pixelSize:9,
            color:C.Color.fromCssColorString(ICON_COLORS[r.sourceType]||'#f59e0b'),
            outlineColor:C.Color.WHITE,outlineWidth:2}}),
    };
    const created=viewer.entities.add(entity);
    ids.set(created.id,r);
  }
  // Optional 3D geometry. Never remove the aircraft billboard: if the glTF
  // cannot load, an invisible model must not hide a real ADS-B observation.
  // Keep an airplane-shaped symbol present for every valid aircraft record.
  for(const r of planes.slice(0,90)){
   const entity=viewer.entities.getById('flights:'+String(r.id||r.title));
   if(!entity)continue;
   entity.orientation=C.Transforms.headingPitchRollQuaternion(
     entity.position.getValue(C.JulianDate.now()),
     new C.HeadingPitchRoll(C.Math.toRadians(Number.isFinite(r.heading)?r.heading:0),0,0));
   entity.model=new C.ModelGraphics({
    uri:'/models/asura-aircraft.gltf',minimumPixelSize:16,maximumScale:125,
    scale:1.2,runAnimations:false,
   });
  }
  const route=routeOverlay||{};
  const origin=route.origin,destination=route.destination;
  function markAirport(a,type,color){
   if(!validPoint(a))return;
   viewer.entities.add({
    id:'airport:'+type,position:toCart(C,a),
    name:String(a.name||a.icao||type),
    point:{pixelSize:15,color:C.Color.fromCssColorString(color),
      outlineColor:C.Color.WHITE,outlineWidth:3},
    label:{text:String(a.iata||a.icao||a.id||type),pixelOffset:new C.Cartesian2(0,-22),
      font:'bold 14px sans-serif',fillColor:C.Color.WHITE,
      outlineColor:C.Color.BLACK,outlineWidth:3,style:C.LabelStyle.FILL_AND_OUTLINE},
   });
  }
  markAirport(origin,'origin','#22c55e');
  markAirport(destination,'destination','#ec4899');
  if(validPoint(origin)&&validPoint(destination)){
   viewer.entities.add({id:'airport-reference',
    polyline:{positions:[toCart(C,origin),toCart(C,destination)],
      width:2,material:new C.PolylineDashMaterialProperty({
       color:C.Color.fromCssColorString('#cbd5e1'),dashLength:16})}});
  }
  const points=(Array.isArray(route.flightPoints)?route.flightPoints:[]).filter(validPoint).slice(-1200);
  if(points.length>=2){
   viewer.entities.add({id:'recorded-track',polyline:{
    positions:points.map(p=>toCart(C,p,Number.isFinite(p.altitudeFeet)?p.altitudeFeet*.3048:0)),
    width:3,material:C.Color.fromCssColorString('#fb7185')}});
  }
  if(validPoint(route.tracking)){
   viewer.entities.add({id:'selected-track-aircraft',
    position:toCart(C,route.tracking,Number.isFinite(route.tracking.altitudeFeet)?
      route.tracking.altitudeFeet*.3048:0),
    billboard:{image:smallPlane,width:45,height:45},
   });
  }
  idLookup.current=ids;
  viewer.scene.requestRender();
 },[ready,records,planes,routeOverlay]);
 useEffect(()=>{
  const viewer=viewerRef.current,C=cesiumRef.current;
  const focus=routeOverlay?.focusAirport;
  if(!ready||!viewer||!C||!validPoint(focus))return;
  viewer.camera.flyTo({destination:C.Cartesian3.fromDegrees(focus.lon,focus.lat,220000),
    orientation:{heading:0,pitch:C.Math.toRadians(-55),roll:0},duration:.7});
 },[routeOverlay?.focusAirport?.lat,routeOverlay?.focusAirport?.lon,ready]);
 const enableBuildings=async()=>{
  const viewer=viewerRef.current,C=cesiumRef.current;
  if(!viewer||!C||buildingBusy||viewer.isDestroyed())return;
  // Toggle off BOTH kinds of geometry, so changing provider never stacks
  // multiple copies of a building or leaves primitives behind.
  if(tileset.current||osmOverlay.current){
   if(tileset.current&&viewer.scene.primitives.contains(tileset.current))
    viewer.scene.primitives.remove(tileset.current);
   if(osmOverlay.current)viewer.dataSources.remove(osmOverlay.current,true);
   tileset.current=null;osmOverlay.current=null;
   setBuildings(false);setBuildingSource('none');
   setIonStatus('3D building layer hidden.');viewer.scene.requestRender();return;
  }
  setBuildingBusy(true);
  let ionError=null;
  try{
   const configResponse=await fetch('/api/cesium/config',{cache:'no-store'});
   const cfg=configResponse.ok?await configResponse.json():{ionEnabled:false};
   if(cfg.ionEnabled&&cfg.publicViewerToken){
    C.Ion.defaultAccessToken=cfg.publicViewerToken;
    try{
     const buildingTiles=await C.createOsmBuildingsAsync();
     if(viewerRef.current!==viewer||viewer.isDestroyed())return;
     tileset.current=viewer.scene.primitives.add(buildingTiles);
     setBuildings(true);setBuildingSource('cesium-ion');
     setIonStatus('Cesium OSM Buildings 3D Tiles requested (asset 96188). Tiles may take time to stream.');
     viewer.scene.requestRender();
     return;
    }catch(error){
     const detail=String(error?.message||'unavailable').slice(0,190);
     ionError='Cesium ion buildings unavailable: '+detail+'. ';
    }
   }
   // Token-free fallback is intentionally small, click-initiated and
   // labelled as approximate OSM extrusions, not real 3D survey data.
   const cameraAltitude=viewer.camera.positionCartographic?.height;
   if(!Number.isFinite(cameraAltitude)||cameraAltitude>10000)
    throw Error((ionError||'')+'Zoom into a neighbourhood (camera altitude below 10 km), then click 3D buildings again.');
   const middle=new C.Cartesian2(viewer.canvas.clientWidth/2,viewer.canvas.clientHeight/2);
   const ground=viewer.camera.pickEllipsoid(middle,viewer.scene.globe.ellipsoid);
   const cart=ground?C.Cartographic.fromCartesian(ground):null;
   if(!cart)throw Error('Move the globe to a visible map location before loading nearby buildings.');
   const lat=C.Math.toDegrees(cart.latitude),lon=C.Math.toDegrees(cart.longitude);
   const url='/api/cesium/buildings?lat='+lat.toFixed(5)+'&lon='+lon.toFixed(5);
   const response=await fetch(url,{cache:'no-store'});
   const data=await response.json();
   if(!response.ok||!data.success)throw Error((ionError||'')+(data.error||'OpenStreetMap building data unavailable.'));
   if(viewerRef.current!==viewer||viewer.isDestroyed())return;
   if(!Array.isArray(data.buildings)||data.buildings.length===0){
    setIonStatus((ionError||'')+'No mapped building footprints nearby. Try a denser city block or configure Cesium ion.');
    return;
   }
   const layer=new C.CustomDataSource('ASURA OSM footprint extrusions');
   const material=C.Color.fromCssColorString('#9ca3af').withAlpha(.88);
   for(const feature of data.buildings.slice(0,120)){
    if(!Array.isArray(feature.outline)||feature.outline.length<3)continue;
    const coords=feature.outline.flatMap(p=>[p[0],p[1]]);
    if(!coords.every(Number.isFinite))continue;
    const first=feature.outline[0];
    const localGround=viewer.scene.globe.getHeight(C.Cartographic.fromDegrees(first[0],first[1]))||0;
    const groundHeight=Math.max(-200,Math.min(6500,localGround));
    layer.entities.add({
     id:'osm:'+feature.id,
     name:'OSM building footprint '+feature.id,
     polygon:{
      hierarchy:C.Cartesian3.fromDegreesArray(coords),
      height:groundHeight,
      extrudedHeight:groundHeight+feature.heightMeters,
      material,outline:true,
      outlineColor:C.Color.fromCssColorString('#e2e8f0').withAlpha(.65),
     },
    });
   }
   await viewer.dataSources.add(layer);
   if(viewerRef.current!==viewer||viewer.isDestroyed()){
    if(!viewer.isDestroyed())viewer.dataSources.remove(layer,true);
    return;
   }
   osmOverlay.current=layer;
   setBuildings(true);setBuildingSource('osm-extrusions');
   setIonStatus('OSM footprint extrusions: '+layer.entities.values.length+
    ' nearby buildings · '+data.heightsMeasured+' OSM heights, '+
    data.heightsEstimated+' level-based estimates, '+
    data.heightsIllustrative+' illustrative 9m heights. NOT surveyed 3D models. © OpenStreetMap contributors.');
   viewer.scene.requestRender();
  }catch(error){
   setIonStatus('3D buildings unavailable: '+String(error?.message||'Unknown error').slice(0,300));
  }finally{
   setBuildingBusy(false);
  }
 };
 const tilt=angle=>{
  const viewer=viewerRef.current,C=cesiumRef.current;
  if(!viewer||!C)return;
  const cart=viewer.camera.positionCartographic;
  viewer.camera.setView({orientation:{heading:viewer.camera.heading,pitch:C.Math.toRadians(angle),roll:0}});
  viewer.scene.requestRender();
 };
 const flightAge=newestObservation?Math.max(0,Math.round((clockTick-newestObservation)/1000)):null;
 const sourceState=flightAge==null?'No aircraft observations':flightAge<=90?'Recently observed':flightAge<=180?'Delayed observations':'Stale positions';
 return <div className="border rounded-lg overflow-hidden bg-slate-950 text-slate-100">
  <div className="px-4 py-3 flex flex-wrap items-center gap-3 justify-between border-b border-slate-700">
   <div>
    <h3 className="font-semibold">CesiumJS 3D Earth Explorer</h3>
    <p className="text-xs text-slate-300">{sceneInfo} · {planes.length} aircraft · {sourceState}
      {flightAge!==null?' · newest position '+flightAge+'s old':''}</p>
   </div>
   <div className="flex flex-wrap gap-2 text-xs">
    <button type="button" onClick={()=>setMode('street')}
      className={'rounded px-3 py-2 border '+(mode==='street'?'bg-sky-700':'border-slate-600')}>Street</button>
    <button type="button" onClick={()=>setMode('satellite')}
      className={'rounded px-3 py-2 border '+(mode==='satellite'?'bg-sky-700':'border-slate-600')}>Satellite mosaic</button>
    <button type="button" onClick={()=>setMode('daily')} disabled={!catalog?.success}
      className={'rounded px-3 py-2 border disabled:opacity-40 '+(mode==='daily'?'bg-sky-700':'border-slate-600')}>NASA dated imagery</button>
   </div>
  </div>
  {mode==='daily'&&<div className="px-4 py-3 bg-slate-900 border-b border-slate-700 flex flex-wrap items-center gap-3 text-xs">
    <label>NASA VIIRS product day <input aria-label="Satellite product date" type="date"
      className="bg-slate-800 border border-slate-600 rounded p-2 ml-2"
      value={imageDate} min={catalog?.availableStart||'2018-01-05'} max={catalog?.lastCatalogDate}
      onChange={e=>setImageDate(e.target.value)}/></label>
    <span>Catalog latest: {catalog?.lastCatalogDate||'unknown'} · Coarse ~250m imagery · Clouds / gaps possible</span>
  </div>}
  {!catalog?.success&&catalog&&<p role="alert" className="px-4 py-2 text-amber-300 text-xs">NASA imagery metadata unavailable: {catalog.error}</p>}
  {error&&<p role="alert" className="px-4 py-2 text-amber-300 text-xs">{error}</p>}
  <div className="relative">
   <div ref={mount} style={{height:600}} className="w-full bg-slate-950" aria-label="Interactive Cesium globe showing 3D terrain and attributed observation entities"/>
   {!ready&&!error&&<div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 text-sm">Loading Cesium globe and 3D assets…</div>}
  </div>
  <div className="p-3 flex flex-wrap gap-2 items-center text-xs border-t border-slate-700">
   <button onClick={()=>tilt(-90)} type="button" className="border border-slate-600 rounded px-3 py-2">Top-down</button>
   <button onClick={()=>tilt(-48)} type="button" className="border border-slate-600 rounded px-3 py-2">Oblique 3D</button>
   <button onClick={enableBuildings} type="button" disabled={!ready||buildingBusy}
    aria-pressed={buildings} aria-label={buildings?'Hide 3D buildings':'Show 3D buildings'}
    className="border border-slate-600 rounded px-3 py-2 disabled:opacity-50">
    {buildingBusy?'Loading 3D buildings…':buildings?'Hide 3D buildings':'3D buildings'}
   </button>
   {buildings&&<span className="text-[10px] font-mono border border-slate-600 rounded px-2 py-1">
    {buildingSource==='cesium-ion'?'Cesium ion 3D Tiles':'OSM approximate extrusion'}
   </span>}
   <span className="text-slate-400">{ionStatus}</span>
  </div>
  {selected&&<div className="px-4 py-3 border-t border-slate-700 text-xs flex flex-wrap gap-4">
   <strong className="text-sm">{selected.title}</strong>
   <span>Provider: {selected.source}</span>
   <span>Observed: {asDate(selected.observedAt)}</span>
   <span>Position: {selected.lat?.toFixed(4)}°, {selected.lon?.toFixed(4)}°</span>
   {selected.icao24&&<span>ICAO: {selected.icao24}</span>}
   {selected.registration&&<span>Registration: {selected.registration}</span>}
   {selected.aircraftType&&<span>Type: {selected.aircraftType}</span>}
   {selected.altitudeFeet!=null&&<span>Barometric altitude: {Math.round(selected.altitudeFeet).toLocaleString()} ft</span>}
   {selected.speedKnots!=null&&<span>Groundspeed: {Math.round(selected.speedKnots)} kt</span>}
   {selected.heading!=null&&<span>Track: {Math.round(selected.heading)}°</span>}
   {Number.isFinite(selected.positionAgeSeconds)&&<span>Age at retrieval: {selected.positionAgeSeconds}s</span>}
   <span>Receiver report, not a confirmed route or arrival</span>
  </div>}
  <p className="px-4 py-3 text-xs text-slate-400 border-t border-slate-700">
   Satellite mosaic pixel dates vary and are not verified as 2026. NASA VIIRS uses a dated daily layer, not live video or high-resolution object identification.
   Aircraft are public receiver reports and may be delayed or incomplete; 3D symbols are not to scale. This viewer is for research, not real-time operational decisions.
  </p>
 </div>;
}
