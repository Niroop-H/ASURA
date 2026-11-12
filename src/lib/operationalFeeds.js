/**
 * ASURA operational-readiness public-source adapters.
 * Read only, bounded source allowlist, and transport/content freshness separated.
 * Public official notices are not certified instructions, flight clearance, or targeting information.
 */
import {createHash} from 'node:crypto';

const DEFINITIONS=[
 {id:'faa_nas',label:'FAA National Airspace System status',domain:'aviation',url:'https://nasstatus.faa.gov/api/airport-status-information',cadenceMinutes:5,maxContentAgeMinutes:20,scope:'United States airport status; not aircraft positions or a NOTAM clearance',attribution:'Federal Aviation Administration',licenseStatus:'official-public-reuse-review'},
 {id:'faa_tfr',label:'FAA public TFR list — aggregate',domain:'aviation',url:'https://tfr.faa.gov/tfrapi/getTfrList',cadenceMinutes:15,maxContentAgeMinutes:1440,scope:'Aggregate counts of published active/future US restrictions, without event geometries or facility-specific listings',attribution:'Federal Aviation Administration',licenseStatus:'official-public-reuse-review'},
 {id:'nws_alerts',label:'NOAA NWS active alerts — named US state',domain:'weather',url:'https://api.weather.gov/alerts/active?area=CA',cadenceMinutes:5,maxContentAgeMinutes:60,scope:'One requested US state; the connectivity probe samples California only, not the whole US',attribution:'NOAA National Weather Service',licenseStatus:'official-public-reuse-review'},
 {id:'fema_disasters',label:'FEMA declared disasters',domain:'humanitarian',url:'https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$top=20&$orderby=declarationDate%20desc',cadenceMinutes:360,maxContentAgeMinutes:10080,scope:'US declared-disaster records; not a live emergency sensor; latest declaration date can be old',attribution:'Federal Emergency Management Agency',licenseStatus:'us-government-public'},
 {id:'cisa_ics',label:'CISA ICS advisories — defensive metadata',domain:'cyber',url:'https://www.cisa.gov/cybersecurity-advisories/ics-advisories.xml',cadenceMinutes:60,maxContentAgeMinutes:10080,scope:'Published industrial control system advisory headlines and links; no exploit details or infrastructure scan',attribution:'Cybersecurity and Infrastructure Security Agency',licenseStatus:'official-public-reuse-review'},
 {id:'nrc_events',label:'NRC daily public event reports — aggregate',domain:'nuclear-safety',url:'https://www.nrc.gov/public-involve/rss?feed=event',cadenceMinutes:360,maxContentAgeMinutes:1440,scope:'Count of publicly listed NRC event notifications; no facility-level operational status or geolocations',attribution:'US Nuclear Regulatory Commission',licenseStatus:'official-public-reuse-review'},
 {id:'imf_portwatch',label:'IMF PortWatch dataset discovery',domain:'maritime',url:'https://portwatch.imf.org/api/search/v1/collections/dataset/items?limit=8',cadenceMinutes:1440,maxContentAgeMinutes:10080,scope:'Public catalogue index ONLY, not daily port volumes, vessel tracks or AIS-derived trade readings; redistribution terms not cleared',attribution:'IMF PortWatch',licenseStatus:'needs-provider-license-verification'},
];
export const OPERATIONAL_SOURCE_IDS=DEFINITIONS.map(x=>x.id);
export function operationalDefinitions(){return DEFINITIONS.map(x=>({...x}));}
const defFor=id=>DEFINITIONS.find(x=>x.id===id);
const clean=(v,n=450)=>String(v??'').replace(/\s+/g,' ').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,n);
const decodeXml=s=>clean(String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
 .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"')
 .replace(/&apos;/g,"'").replace(/&amp;/g,'&'),1000);
const noHtml=s=>clean(decodeXml(s).replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' '),480);
const xmlField=(s,tag)=>decodeXml(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>','i').exec(s)?.[1]||'');
const xmlBlocks=(s,tag)=>[...String(s).matchAll(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>','gi'))].map(m=>m[1]);
const iso=s=>{
 const d=new Date(s);
 return Number.isFinite(d.getTime())?d.toISOString():null;
};
const latest=dates=>{
 const values=dates.map(iso).filter(Boolean);
 return values.length?values.sort().at(-1):null;
};
export function freshnessStatus(sourceTime,now=new Date(),maxAgeMinutes=60){
 if(!sourceTime)return {state:'unknown',ageMinutes:null,reason:'Provider did not supply a reliable publication or observation timestamp'};
 const elapsed=(new Date(now).getTime()-new Date(sourceTime).getTime())/60000;
 if(!Number.isFinite(elapsed))return {state:'unknown',ageMinutes:null,reason:'Source timestamp is not parseable'};
 if(elapsed< -5)return {state:'invalid',ageMinutes:Math.round(elapsed),reason:'Provider timestamp lies in the future'};
 return {state:elapsed>maxAgeMinutes?'stale':'fresh',ageMinutes:Math.max(0,Math.round(elapsed)),
  reason:elapsed>maxAgeMinutes?'Latest item exceeds this source freshness threshold':'Latest item is within this source freshness threshold'};
}
const stateCodes={
 Alabama:'AL',Alaska:'AK',Arizona:'AZ',Arkansas:'AR',California:'CA',Colorado:'CO',
 Connecticut:'CT',Delaware:'DE',Florida:'FL',Georgia:'GA',Hawaii:'HI',Idaho:'ID',
 Illinois:'IL',Indiana:'IN',Iowa:'IA',Kansas:'KS',Kentucky:'KY',Louisiana:'LA',
 Maine:'ME',Maryland:'MD',Massachusetts:'MA',Michigan:'MI',Minnesota:'MN',
 Mississippi:'MS',Missouri:'MO',Montana:'MT',Nebraska:'NE',Nevada:'NV',
 'New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY',
 'North Carolina':'NC','North Dakota':'ND',Ohio:'OH',Oklahoma:'OK',Oregon:'OR',
 Pennsylvania:'PA','Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD',
 Tennessee:'TN',Texas:'TX',Utah:'UT',Vermont:'VT',Virginia:'VA',Washington:'WA',
 'West Virginia':'WV',Wisconsin:'WI',Wyoming:'WY',
 'District of Columbia':'DC'
};
export function requestedState(question){
 const q=' '+String(question||'').toLowerCase().replace(/[^a-z ]/g,' ')+' ';
 const entries=Object.entries(stateCodes).sort((a,b)=>b[0].length-a[0].length);
 const match=entries.find(([name])=>q.includes(' '+name.toLowerCase()+' '));
 if(match)return match[1];
 const abbrev=String(question).match(/\b(?:in|for|of)\s+([A-Z]{2})\b/);
 return abbrev&&Object.values(stateCodes).includes(abbrev[1])?abbrev[1]:null;
}
function record(id,kind,title,description,url,observedAt,index,extra={}){
 const safeUrl=typeof url==='string'&&/^https:\/\//.test(url)?url:null;
 return {id:kind+':'+(index+1),source:kind,provider:clean(defFor(kind)?.attribution),
  title:clean(title,180),description:clean(description,600),url:safeUrl,
  observedAt:iso(observedAt),retrievedAt:new Date().toISOString(),dataCategory:'official-public-notice',
  operationVerified:false,...extra};
}
function faaNas(text){
 if(!/<AIRPORT_STATUS_INFORMATION>/.test(text))throw Error('FAA NAS schema mismatch');
 const rawTime=xmlField(text,'Update_Time'),sourceTime=iso(rawTime);
 if(!sourceTime)throw Error('FAA NAS update timestamp missing or invalid');
 const items=[];
 for(const group of xmlBlocks(text,'Delay_type')){
  const category=xmlField(group,'Name')||'FAA notice';
  for(const block of xmlBlocks(group,'Airport')){
   const code=xmlField(block,'ARPT');
   if(!/^[A-Z0-9]{3,4}$/.test(code))continue;
   const reason=xmlField(block,'Reason');
   const summary=[xmlField(block,'Average_Delay'),xmlField(block,'Min_Delay'),
    xmlField(block,'Max_Delay'),xmlField(block,'Start'),xmlField(block,'Reopen')].filter(Boolean).join('; ');
   items.push(record('faa_nas','faa_nas',code+' — '+category,
    [reason,summary].filter(Boolean).join(' | ')||'Published airport event',
    'https://nasstatus.faa.gov/',sourceTime,items.length,
    {dataCategory:'published-airport-status'}));
  }
 }
 return {records:items.slice(0,24),sourceTime,sourceCount:items.length,
  note:'Published US airport traffic-management status; not a certified current NOTAM or flight movement record'};
}
function faaTfr(data){
 if(!Array.isArray(data))throw Error('FAA TFR list schema mismatch');
 const count=new Map(),times=[];
 for(const r of data){
  const type=clean(r.type||'UNSPECIFIED',45);
  count.set(type,(count.get(type)||0)+1);
  const m=String(r.mod_abs_time||'').match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if(m)times.push(iso(m[1]+'-'+m[2]+'-'+m[3]+'T'+m[4]+':'+m[5]+':00Z'));
 }
 const records=[...count.entries()].map(([name,n],i)=>record('faa_tfr','faa_tfr',
  name+' — '+n+' published TFR notices',
  'Aggregate category count in published FAA list (includes active and future notices). No claim that every listed notice is active at this moment.',
  'https://tfr.faa.gov/',null,i,{dataCategory:'aggregate-airspace-notice-count'}));
 return {records:records.slice(0,12),sourceTime:latest(times),sourceCount:data.length,
  note:'Categorized counts only; actual NOTAM / TFR restrictions must be checked with the FAA before any flight.'};
}
function nws(data,requested){
 if(!data||data.type!=='FeatureCollection'||!Array.isArray(data.features))throw Error('NWS GeoJSON schema mismatch');
 const records=data.features.slice(0,20).map((feature,i)=>{
  const p=feature?.properties||{};
  return record('nws_alerts','nws_alerts',
   (p.event||'Weather alert')+' — '+(p.areaDesc||requested),
   [p.headline,p.severity?'Severity: '+p.severity:'',p.urgency?'Urgency: '+p.urgency:'',
    p.expires?'Expires: '+p.expires:''].filter(Boolean).join('; '),
   p['@id']||p.id||'https://www.weather.gov/alerts',p.sent||p.effective,i,
   {dataCategory:'official-weather-alert',expiresAt:iso(p.expires)});}
 );
 return {records,sourceTime:latest(data.features.map(x=>x.properties?.sent)),
  sourceCount:data.features.length,note:'Active NWS advisories for '+requested+' at retrieval. No alerts is a valid empty response, not a forecast of safety.'};
}
function fema(data){
 if(!data||!Array.isArray(data.DisasterDeclarationsSummaries))throw Error('FEMA schema mismatch');
 const rows=data.DisasterDeclarationsSummaries;
 return {records:rows.slice(0,18).map((x,i)=>
  record('fema_disasters','fema_disasters',
   clean(x.femaDeclarationString||x.disasterNumber||'FEMA declaration')+' — '+clean(x.state,12),
   'Declared incident type: '+clean(x.incidentType||'unspecified')+
    '; declaration date '+clean(x.declarationDate||'unreported')+
    '; affected state '+clean(x.state,12)+'. This is an official declaration record, not current incident severity.',
   'https://www.fema.gov/disaster/'+clean(x.disasterNumber,12),x.declarationDate,i,
   {dataCategory:'federal-disaster-declaration'})),
  sourceTime:latest(rows.map(x=>x.declarationDate)),sourceCount:rows.length,
  note:'Latest published FEMA disaster declarations; declaration date is not the database refresh timestamp.'};
}
function rss(text,id,aggregate=false){
 if(!/<rss\b/i.test(text)||!/<channel>/i.test(text))throw Error('Official RSS schema mismatch');
 const entries=xmlBlocks(text,'item').slice(0,22).map(x=>({
  title:noHtml(xmlField(x,'title')),url:xmlField(x,'link'),
  time:iso(xmlField(x,'pubDate')||xmlField(x,'dc:date'))
 }));
 if(aggregate)return {records:[record(id,id,
  entries.length+' public event entries in NRC daily-event feed',
  'This is the number of entries returned in the current public RSS response, not an incident count or assessment of facility status. See the NRC source for original details.',
  'https://www.nrc.gov/rss-feeds',null,0,{dataCategory:'aggregate-event-feed-count'})],
  sourceTime:latest(entries.map(x=>x.time)),sourceCount:entries.length,
  note:'Public events feed count only. Publication timestamps missing when not supplied; no facility targeting map.'};
 return {records:entries.slice(0,12).map((x,i)=>record(id,id,x.title,
  'Official defensive advisory headline. Verify current mitigation steps and disclosure with publisher.',
  x.url,x.time,i,{dataCategory:'published-defensive-advisory'})),
  sourceTime:latest(entries.map(x=>x.time)),sourceCount:entries.length,
  note:'Published ICS vulnerability advisories for authorized defensive analysis; not an asset scan or exploitation feed.'};
}
function portwatch(data){
 if(data?.type!=='FeatureCollection'||!Array.isArray(data.features))throw Error('IMF catalogue schema mismatch');
 const records=data.features.slice(0,8).map((x,i)=>{
  const p=x.properties||{},title=clean(p.title||'Untitled IMF dataset',150);
  return record('imf_portwatch','imf_portwatch',title,
   'IMF PortWatch public dataset catalogue entry. No AIS observations, port movements or trade values were fetched. Dataset licence must be reviewed before redistribution.',
   'https://portwatch.imf.org/',null,i,{dataCategory:'catalogue-entry-only'});
 });
 return {records,sourceCount:data.features.length,sourceTime:null,
  note:'DISCOVERY ONLY — no published daily maritime observations have been integrated. Source redistribution terms pending review.'};
}
const parse={
 faa_nas:(text)=>faaNas(text),faa_tfr:(text)=>faaTfr(JSON.parse(text)),
 nws_alerts:(text,detail)=>nws(JSON.parse(text),detail),
 fema_disasters:(text)=>fema(JSON.parse(text)),
 cisa_ics:(text)=>rss(text,'cisa_ics'),
 nrc_events:(text)=>rss(text,'nrc_events',true),
 imf_portwatch:(text)=>portwatch(JSON.parse(text))
};
export function parseOperationalFixture(id,text,detail){
 if(!parse[id])throw Error('Unknown operational source');
 return parse[id](text,detail);
}
const MAX_BYTES=2200000;
async function boundedRead(url,{fetcher=fetch,timeoutMs=9000}={}){
 const r=await fetcher(url,{cache:'no-store',signal:AbortSignal.timeout(timeoutMs),
  headers:{'User-Agent':'ASURA (public data monitoring; research@mahquantum.tech)',
   Accept:'application/json,application/geo+json,application/rss+xml,application/xml,text/xml,*/*'}});
 if(!r?.ok)throw Error('Source HTTP '+(r?.status??'unknown'));
 if(Number(r.headers?.get('content-length')||0)>MAX_BYTES)throw Error('Source exceeds bounded payload limit');
 const body=await r.text();
 if(body.length>MAX_BYTES)throw Error('Source exceeds bounded payload limit');
 return body;
}
export async function getOperationalSource(id,question='',opts={}){
 const definition=defFor(id);
 if(!definition)throw Error('Unknown source ID');
 let target=definition.url,requested='California (health sample)';
 if(id==='nws_alerts'&&opts.healthProbe!==true){
  const state=requestedState(question);
  if(!state)throw Error('Please specify a US state for NWS active alerts (for example: California or Texas). No location assumed.');
  target='https://api.weather.gov/alerts/active?area='+state;requested=state;
 }
 const checkedAt=new Date().toISOString();
 try{
  const text=await boundedRead(target,opts);
  const parsed=parseOperationalFixture(id,text,requested);
  const content=freshnessStatus(parsed.sourceTime,checkedAt,definition.maxContentAgeMinutes);
  const status={
   source:id,name:definition.label,transport:'ok',content:content.state,
   sourceTime:parsed.sourceTime||null,retrievedAt:checkedAt,checkedAt,
   ageMinutes:content.ageMinutes,reason:content.reason,
   sourceCount:parsed.sourceCount,notes:parsed.note,
   scope:definition.scope,cadenceMinutes:definition.cadenceMinutes,
   maxContentAgeMinutes:definition.maxContentAgeMinutes,
   licensing:definition.licenseStatus,provider:definition.attribution,
   // Discovery-only catalogues never count as validated observations.
   usableForOperationalClaims:id!=='imf_portwatch'&&content.state==='fresh'
  };
  const records=parsed.records.map((x,i)=>({
   ...x,id:id+':'+(i+1),retrievedAt:checkedAt,
   freshness:content.state,sourceTime:parsed.sourceTime||null
  }));
  const digest=createHash('sha256').update(JSON.stringify({id,checkedAt,status,records})).digest('hex');
  return {source:id,success:true,provider:definition.attribution,records,
   status,checkedAt,sha256:digest};
 }catch(e){
  return {source:id,success:false,records:[],checkedAt,
   status:{source:id,name:definition.label,transport:'down',content:'unknown',
    checkedAt,retrievedAt:null,sourceTime:null,
    reason:clean(e.message,170),scope:definition.scope,cadenceMinutes:definition.cadenceMinutes,
    maxContentAgeMinutes:definition.maxContentAgeMinutes,licensing:definition.licenseStatus,
    usableForOperationalClaims:false}};
 }
}
export async function probeOperationalSources(selected=OPERATIONAL_SOURCE_IDS,opts={}){
 const allowed=[...new Set(selected)].filter(x=>OPERATIONAL_SOURCE_IDS.includes(x)).slice(0,7);
 const results=await Promise.all(allowed.map(id=>getOperationalSource(id,'',{...opts,healthProbe:true})));
 return {checkedAt:new Date().toISOString(),
  coverage:'On-demand independent checks; no continuous uptime claim or durable audit log',
  sources:results.map(x=>({...x.status,recordCount:x.records.length,sha256:x.sha256||null})),
  readyCount:results.filter(x=>x.status?.usableForOperationalClaims).length,
  checkCount:results.length,checksNotCertification:true};
}
