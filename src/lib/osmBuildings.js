/**
 * ASURA experimental no-key buildings: OSM polygon extrusions.
 *
 * They are NOT photogrammetry, actual surveyed building heights, and cannot
 * replace Cesium OSM Buildings 3D Tiles. Only tagged way geometries are used.
 * Explicit provenance and heightSource are retained with each record.
 */
export const MAX_OSM_BUILDINGS=120;
export const MAX_OVERPASS_ELEMENTS=350;
const isNumber=n=>typeof n==='number'&&Number.isFinite(n);
const rad=d=>d*Math.PI/180;

export function buildingQueryBounds(latitude,longitude){
 const lat=Number(latitude),lon=Number(longitude);
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>80||Math.abs(lon)>179.5)
  throw new Error('Buildings fallback is available only for finite geographic coordinates between ±80° latitude.');
 // Grid snapping increases public cache hit rate and prevents continuously
 // changing coordinates from creating unbounded Overpass requests.
 const qLat=Math.round(lat*1000)/1000,qLon=Math.round(lon*1000)/1000;
 const radiusLat=.0018; // about 200m north/south
 const radiusLon=Math.min(.01,radiusLat/Math.max(.22,Math.cos(rad(qLat))));
 return {
  lat:qLat,lon:qLon,
  south:+(qLat-radiusLat).toFixed(6),
  north:+(qLat+radiusLat).toFixed(6),
  west:+(qLon-radiusLon).toFixed(6),
  east:+(qLon+radiusLon).toFixed(6),
 };
}
const parseNumber=(value)=>{
 if(typeof value!=='string'&&typeof value!=='number')return null;
 const s=String(value).trim().toLowerCase();
 if(!/^\d{1,3}(?:\.\d{1,2})?(?:\s*(?:m|meter|meters|ft|feet))?$/.test(s))return null;
 const n=Number.parseFloat(s);
 return Number.isFinite(n)?n*(/\b(?:ft|feet)$/.test(s)?0.3048:1):null;
};
export function buildingHeight(tags={}){
 const known=parseNumber(tags.height);
 if(known!==null&&known>=2&&known<=160)
  return {heightMeters:+known.toFixed(1),heightSource:'osm-height'};
 const levels=parseNumber(tags['building:levels']);
 if(levels!==null&&levels>=1&&levels<=55)
  return {heightMeters:+(levels*3).toFixed(1),heightSource:'estimated-3m-per-level'};
 // Clear visualization-only default. Never label this as measured height.
 return {heightMeters:9,heightSource:'illustrative-unmeasured'};
}
export function normalizeOsmBuildings(payload,bounds,maxBuildings=MAX_OSM_BUILDINGS){
 if(!payload||!Array.isArray(payload.elements))throw Error('Overpass did not return a valid building dataset.');
 if(payload.elements.length>MAX_OVERPASS_ELEMENTS)throw Error('Overpass returned too many features for the bounded viewer.');
 const count=Math.min(MAX_OSM_BUILDINGS,Math.max(0,Math.trunc(maxBuildings)));
 const buildings=[],used=new Set();
 for(const feature of payload.elements){
  if(buildings.length>=count)break;
  if(feature?.type!=='way'||!Number.isSafeInteger(feature.id)||feature.id<=0||
    feature.tags?.building==='no'||!feature.tags?.building||used.has(feature.id))continue;
  const geometry=feature.geometry;
  if(!Array.isArray(geometry)||geometry.length<4||geometry.length>90)continue;
  const coords=[];
  let valid=true;
  for(const vertex of geometry){
   if(!isNumber(vertex?.lat)||!isNumber(vertex?.lon)||
      Math.abs(vertex.lat)>90||Math.abs(vertex.lon)>180||
      vertex.lat<bounds.south-.02||vertex.lat>bounds.north+.02||
      vertex.lon<bounds.west-.02||vertex.lon>bounds.east+.02){
     valid=false;break;
   }
   coords.push([+vertex.lon.toFixed(7),+vertex.lat.toFixed(7)]);
  }
  if(!valid)continue;
  const first=coords[0],last=coords[coords.length-1];
  if(Math.abs(first[0]-last[0])>1e-6||Math.abs(first[1]-last[1])>1e-6)continue;
  coords.pop(); // Cesium closes the polygon; avoid duplicate final vertex.
  if(new Set(coords.map(x=>x.join(','))).size<3)continue;
  const h=buildingHeight(feature.tags);
  buildings.push({
   id:'way/'+feature.id,
   outline:coords,
   ...h,
   source:'OpenStreetMap',
   observedAt:null,
  });
  used.add(feature.id);
 }
 return {
  buildings,count:buildings.length,
  heightsMeasured:buildings.filter(x=>x.heightSource==='osm-height').length,
  heightsEstimated:buildings.filter(x=>x.heightSource==='estimated-3m-per-level').length,
  heightsIllustrative:buildings.filter(x=>x.heightSource==='illustrative-unmeasured').length,
 };
}
