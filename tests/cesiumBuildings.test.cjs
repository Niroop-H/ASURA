const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const dataUri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const helperUri=dataUri(fs.readFileSync('src/lib/osmBuildings.js','utf8'));
const helper=import(helperUri);

const makeBuilding=(id=123,tags={building:'yes',height:'20 m'})=>({
 type:'way',id,tags,geometry:[
  {lat:12.97,lon:77.59},{lat:12.97,lon:77.591},
  {lat:12.971,lon:77.591},{lat:12.971,lon:77.59},
  {lat:12.97,lon:77.59},
 ]
});

test('bounded map-centred OSM query snaps to cache-friendly coordinates',async()=>{
 const {buildingQueryBounds}=await helper;
 const b=buildingQueryBounds(12.97012,77.59018);
 assert.equal(b.lat,12.970);
 assert.equal(b.lon,77.590);
 assert.ok(b.north>b.south&&b.east>b.west);
 assert.ok(b.north-b.south<.004);
 assert.throws(()=>buildingQueryBounds(91,77),/between/);
 assert.throws(()=>buildingQueryBounds(NaN,77),/between/);
 assert.throws(()=>buildingQueryBounds(12,180),/between/);
});

test('OSM heights are labelled as measured, level-derived or illustrative, never invented as verified',async()=>{
 const {buildingHeight}=await helper;
 assert.deepEqual(buildingHeight({height:'18.5 m'}),{heightMeters:18.5,heightSource:'osm-height'});
 assert.deepEqual(buildingHeight({height:'30 ft'}),{heightMeters:9.1,heightSource:'osm-height'});
 assert.deepEqual(buildingHeight({'building:levels':'5'}),{heightMeters:15,heightSource:'estimated-3m-per-level'});
 assert.deepEqual(buildingHeight({}),{heightMeters:9,heightSource:'illustrative-unmeasured'});
 assert.equal(buildingHeight({height:'99999'}).heightSource,'illustrative-unmeasured');
});

test('footprints validate closed ways, geometry, source tags and bounded output size',async()=>{
 const {buildingQueryBounds,normalizeOsmBuildings}=await helper;
 const b=buildingQueryBounds(12.970,77.590);
 const main=normalizeOsmBuildings({elements:[
  makeBuilding(),makeBuilding(124,{building:'yes','building:levels':'3'}),
  makeBuilding(123), // duplicate
  {...makeBuilding(125),tags:{building:'no'}},
  {...makeBuilding(126),geometry:[{lat:1,lon:2}]},
  {...makeBuilding(127),type:'relation'},
 ]},b);
 assert.equal(main.count,2);
 assert.equal(main.heightsMeasured,1);
 assert.equal(main.heightsEstimated,1);
 assert.deepEqual(main.buildings[0].outline[0],[77.59,12.97]);
 assert.equal(main.buildings[0].outline.length,4);
 const many=Array.from({length:145},(_,i)=>makeBuilding(500+i));
 assert.equal(normalizeOsmBuildings({elements:many},b).count,120);
 assert.throws(()=>normalizeOsmBuildings({elements:Array.from({length:360},(_,i)=>makeBuilding(600+i))},b),/too many/);
 assert.throws(()=>normalizeOsmBuildings({},b),/valid building dataset/);
});

test('bounded OSM route fetches one small cached query and discloses approximate geometry',async()=>{
 const file=fs.readFileSync('src/app/api/cesium/buildings/route.js','utf8')
  .replace("import {NextResponse} from 'next/server';",
   'const NextResponse={json:(data,options)=>Response.json(data,options)};')
  .replace("from '@/lib/osmBuildings';","from "+JSON.stringify(helperUri)+";");
 const {GET}=await import(dataUri(file));
 const old=globalThis.fetch;let calls=0,url='';
 globalThis.fetch=async(next)=>{
  calls++;url=next;
  return Response.json({elements:[makeBuilding()]});
 };
 try{
  const req=new Request('http://localhost/api/cesium/buildings?lat=12.97011&lon=77.59018');
  const first=await GET(req);
  assert.equal(first.status,200);
  const body=await first.json();
  assert.equal(body.success,true);
  assert.equal(body.count,1);
  assert.equal(body.mode,'openstreetmap-footprint-extrusions');
  assert.equal(body.buildings[0].heightSource,'osm-height');
  assert.match(body.warning,/approximations/i);
  assert.match(body.attribution,/OpenStreetMap/);
  assert.ok(url.startsWith('https://overpass-api.de/api/interpreter?data='));
  const second=await GET(req);
  assert.equal(second.status,200);
  assert.equal((await second.json()).fromCache,true);
  assert.equal(calls,1,'a repeated map center uses cached geometry');
  const invalid=await GET(new Request('http://localhost/api/cesium/buildings?lat=91&lon=77'));
  assert.equal(invalid.status,400);
  assert.equal(calls,1);
  const throttled=await GET(new Request('http://localhost/api/cesium/buildings?lat=13.001&lon=77.590'));
  assert.equal(throttled.status,429,'new area is throttled during global per-instance cooldown');
 }finally{globalThis.fetch=old}
});

test('viewer retains the secure ion path, with a clearly labelled no-token fallback',()=>{
 const src=fs.readFileSync('src/components/CesiumGlobe.jsx','utf8');
 assert.ok(src.includes('C.createOsmBuildingsAsync()'));
 assert.ok(src.includes('/api/cesium/buildings?lat='));
 assert.ok(src.includes("setBuildingSource('osm-extrusions')"));
 assert.ok(src.includes('NOT surveyed 3D models'));
 assert.ok(src.includes('buildingBusy'));
 const config=fs.readFileSync('src/app/api/cesium/config/route.js','utf8');
 assert.ok(config.includes('tokenPermissionsVerified:false'));
 assert.ok(config.includes('osmFootprintFallback:true'));
 assert.ok(!config.includes("process.env.CESIUM_ION_ACCESS_TOKEN"));
});
