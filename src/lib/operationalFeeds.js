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
 {id:'noaa_swpc_kp',label:'NOAA planetary Kp observed index',domain:'space',url:'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',cadenceMinutes:60,maxContentAgeMinutes:720,scope:'Published global geomagnetic Kp observations; no localized GNSS jamming or interference inference',attribution:'NOAA Space Weather Prediction Center',licenseStatus:'us-government-public'},
 {id:'nasdaq_halts',label:'Nasdaq Trader public trading-halt RSS',domain:'finance',url:'https://www.nasdaqtrader.com/rss.aspx?feed=tradehalts',cadenceMinutes:5,maxContentAgeMinutes:1440,scope:'Published US listed-security trading halt notices; event-driven and may be empty on non-trading days; not quotes or execution data',attribution:'Nasdaq Trader',licenseStatus:'provider-terms-review-required'},
 {id:'federal_register',label:'US Federal Register published documents',domain:'governance',url:'https://www.federalregister.gov/api/v1/documents.json?per_page=20&order=newest',cadenceMinutes:360,maxContentAgeMinutes:10080,scope:'Recently published US federal regulations/notices, not proof of legally effective requirements; verify the official PDF',attribution:'Office of the Federal Register',licenseStatus:'official-public-reuse-review'},
 {id:'fcdo_travel',label:'UK FCDO country travel advice',domain:'travel',url:'https://www.gov.uk/api/content/foreign-travel-advice/india',cadenceMinutes:720,maxContentAgeMinutes:43200,scope:'Official UK travel advice for one explicitly named supported country; default readiness probe checks India only',attribution:'UK Foreign, Commonwealth & Development Office',licenseStatus:'open-government-license-review'},

 {id:'gdacs_alerts',label:'GDACS public multihazard RSS headlines',domain:'humanitarian',url:'https://www.gdacs.org/contentdata/xml/rss_24h.xml',cadenceMinutes:60,maxContentAgeMinutes:2880,scope:'Published hazard alerts in last 24 hours; no geographic targeting or certified local warning',attribution:'Global Disaster Alert and Coordination System',licenseStatus:'public-attribution-disclaimer-review'},
 {id:'uscg_lnm',label:'USCG Local Notices to Mariners RSS — single district',domain:'maritime',url:'https://public.govdelivery.com/topics/USDHSCG_111/feed.rss',cadenceMinutes:360,maxContentAgeMinutes:20160,scope:'One district notice feed, NOT comprehensive navigation warnings',attribution:'US Coast Guard NAVCEN / GovDelivery',licenseStatus:'official-public-reuse-review'},
 {id:'nasa_donki',label:'NASA DONKI geomagnetic storm event notifications',domain:'space',url:'https://api.nasa.gov/DONKI/GST',cadenceMinutes:360,maxContentAgeMinutes:10080,scope:'Published interpreted geomagnetic events; NOT localized GNSS interference data',attribution:'NASA DONKI Space Weather',licenseStatus:'us-government-public'},
 {id:'treasury_debt',label:'US Treasury debt-to-the-penny reported balances',domain:'finance',url:'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?fields=record_date,debt_held_public_amt,intragov_hold_amt,tot_pub_debt_out_amt&sort=-record_date&page%5Bsize%5D=5',cadenceMinutes:360,maxContentAgeMinutes:10080,scope:'Historical US fiscal accounting observations, not live market data',attribution:'US Treasury Bureau of the Fiscal Service',licenseStatus:'us-government-public'},
 {id:'dvids_news',label:'DVIDS published defence media',domain:'defence',url:'https://api.dvidshub.net/search?type=news&sort=publishdate&sortdir=desc&max_results=12',cadenceMinutes:360,maxContentAgeMinutes:10080,scope:'Published official news releases, not independent event confirmation; requires DVIDS_API_KEY',attribution:'Defense Visual Information Distribution Service',licenseStatus:'provider-terms-review-required'},
 {id:'imf_portwatch_daily',label:'IMF PortWatch daily port trade estimates — permission gated',domain:'maritime',url:'https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Ports_Data/FeatureServer/0/query?where=1%3D1&outFields=date,portid,portname,portcalls,import,export&returnGeometry=false&orderByFields=date%20DESC&resultRecordCount=8&f=json',cadenceMinutes:1440,maxContentAgeMinutes:30240,scope:'Limited sample of lagged public trade estimates, not live AIS; permission needed for systematic/commercial reuse',attribution:'International Monetary Fund PortWatch',licenseStatus:'written-permission-required'},
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
 // new Date(null) and new Date('') can falsely manufacture the Unix epoch.
 if(s===null||s===undefined||typeof s==='string'&&!s.trim())return null;
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

function swpcKp(text){
 const data=JSON.parse(text);
 if(!Array.isArray(data))throw Error('NOAA Kp schema mismatch');
 const parsed=data.map(row=>{
  if(!row||typeof row.time_tag!=='string'||!Number.isFinite(Number(row.Kp))||Number(row.Kp)<0||Number(row.Kp)>9)return null;
  const time=iso(row.time_tag.replace(' ','T').replace(/(?:Z|[+-]\d\d:\d\d)$/,'')+'Z');
  return time?{time,kp:Number(row.Kp),stations:row.station_count}:null;
 }).filter(Boolean).sort((a,b)=>a.time.localeCompare(b.time));
 if(data.length&&!parsed.length)throw Error('NOAA Kp observations invalid');
 const sample=parsed.slice(-8).reverse();
 return {records:sample.map((x,i)=>record('noaa_swpc_kp','noaa_swpc_kp',
  'Planetary Kp '+x.kp.toFixed(2)+' (3-hour index)',
  'Observed geomagnetic disturbance index Kp (dimensionless, 0–9). This is not a measurement of localized GNSS interference.',
  'https://www.swpc.noaa.gov/products/planetary-k-index',x.time,i,
  {dataCategory:'published-geophysical-observation',metric:'Kp',value:x.kp,unit:'dimensionless'})),
  sourceTime:latest(parsed.map(x=>x.time)),sourceCount:parsed.length,
  note:'Global historical Kp index; reading interval is three hours, not a real-time GPS-jamming detector.'};
}
function nasdaqHalts(text){
 if(!/<rss\b/i.test(text)||!/<channel(?:\s[^>]*)?>/i.test(text))throw Error('Nasdaq RSS schema mismatch');
 const items=xmlBlocks(text,'item');
 const notices=items.slice(0,25).map((item,i)=>{
  const symbol=xmlField(item,'ndaq:Symbol');
  const title=noHtml(xmlField(item,'title'))||('Published trading halt'+(symbol?' — '+symbol:''));
  const desc=noHtml(xmlField(item,'description'));
  const published=iso(xmlField(item,'pubDate'));
  return record('nasdaq_halts','nasdaq_halts',title,
   desc||'Published exchange halt notice; consult Nasdaq for the present market status.',
   'https://www.nasdaqtrader.com/trader.aspx?id=TradeHalts',published,i,
   {dataCategory:'published-trading-halt-notice'});
 });
 return {records:notices.slice(0,20),
  sourceTime:latest(notices.map(r=>r.observedAt)),sourceCount:items.length,
  note:'Trading-halt RSS: publication records only. An empty or old feed does not prove trading is unrestricted or the venue is online.'};
}
function federalRegister(text){
 const data=JSON.parse(text);
 if(!data||!Array.isArray(data.results)||!Number.isFinite(Number(data.count)))throw Error('Federal Register schema mismatch');
 const rows=data.results.slice(0,20);
 const records=rows.map((x,i)=>{
  const date=typeof x.publication_date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x.publication_date)
   ?iso(x.publication_date+'T00:00:00Z'):null;
  return record('federal_register','federal_register',x.title||'Federal Register publication',
   ['Type: '+clean(x.type||'unspecified',40),'Publication date: '+clean(x.publication_date||'unreported',30),
    'Document number: '+clean(x.document_number||'unreported',35),
    'Consult official PDF for legally authoritative text'].join('; '),
   x.html_url||'https://www.federalregister.gov/',date,i,
   {dataCategory:'federal-regulatory-publication'});
 });
 return {records,sourceTime:latest(records.map(r=>r.observedAt)),sourceCount:Number(data.count),
  note:'Published administrative notices are historical records, not a stream of currently applicable law. Check the official edition.'};
}
const FCDO_COUNTRIES=Object.freeze({
 india:'india',japan:'japan',france:'france',germany:'germany',
 'united states':'usa',usa:'usa',canada:'canada',australia:'australia',
 brazil:'brazil',china:'china',italy:'italy',singapore:'singapore',
 thailand:'thailand',turkey:'turkey',indonesia:'indonesia',
 'south korea':'south-korea',russia:'russia',ukraine:'ukraine',
 'united arab emirates':'united-arab-emirates'
});
function fcdoCountry(question){
 const q=String(question||'').toLowerCase();
 const name=Object.keys(FCDO_COUNTRIES).sort((a,b)=>b.length-a.length)
  .find(k=>new RegExp('(?:^|[^a-z])'+k+'(?:$|[^a-z])').test(q));
 return name?{name,slug:FCDO_COUNTRIES[name]}:null;
}
function fcdoAdvice(text){
 const data=JSON.parse(text);
 if(data?.schema_name!=='travel_advice'||typeof data.title!=='string'||
    typeof data.web_url!=='string'||!data.web_url.startsWith('https://www.gov.uk/'))
  throw Error('FCDO travel advice schema mismatch');
 const published=iso(data.public_updated_at);
 const description=noHtml(data.description||'');
 return {records:[record('fcdo_travel','fcdo_travel',data.title,
  description||'Official UK FCDO travel advice page. Recheck the full advice before travel.',
  data.web_url,published,0,{dataCategory:'country-level-public-travel-advice'})],
  sourceCount:1,sourceTime:published,
  note:'Country-level UK government advice; publication date is not a live risk sensor. Read the latest full country advice and local authority notices.'};
}


function noticeRss(text,id,category,note){
 if(!/<rss\b/i.test(text)||!/<channel(?:\s[^>]*)?>/i.test(text))throw Error('Public RSS schema mismatch');
 const items=xmlBlocks(text,'item');
 const records=items.slice(0,20).map((item,i)=>{
  const title=noHtml(xmlField(item,'title')),time=iso(xmlField(item,'pubDate'));
  return title?record(id,id,title,'Published public notice. Refer to the official source for complete context.',
   xmlField(item,'link'),time,i,{dataCategory:category}):null;
 }).filter(Boolean);
 return {records,sourceCount:items.length,sourceTime:latest(records.map(r=>r.observedAt)),
  note:note+' No new headline is NOT an all-clear or proof of full coverage.'};
}
function nasaDonki(text){
 const data=JSON.parse(text);
 if(!Array.isArray(data))throw Error('NASA DONKI event schema mismatch');
 const rows=data.filter(x=>x&&iso(x.startTime)).sort((a,b)=>String(b.startTime).localeCompare(String(a.startTime)));
 if(data.length&&!rows.length)throw Error('NASA DONKI event timestamps invalid');
 const records=rows.slice(0,12).map((x,i)=>{
  const time=iso(x.startTime);
  const kp=(Array.isArray(x.allKpIndex)?x.allKpIndex:[])
   .map(y=>Number(y.kpIndex)).filter(n=>Number.isFinite(n)&&n>=0&&n<=9);
  const maxKp=kp.length?Math.max(...kp):null;
  return record('nasa_donki','nasa_donki',
   'NASA geomagnetic storm event '+clean(x.gstID||'',45),
   'Event started: '+time+(maxKp===null?'':'; highest reported Kp: '+maxKp)+
   '. Event notification, not realtime GNSS-disruption monitoring.',
   typeof x.link==='string'&&x.link.startsWith('https://')?x.link:
   'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',time,i,
   {dataCategory:'published-space-weather-event',maxKp});
 });
 return {records,sourceCount:data.length,sourceTime:latest(records.map(x=>x.observedAt)),
  note:'NASA published geomagnetic event records; absence of new events is not proof of uninterrupted GNSS.'};
}
function treasuryDebt(text){
 const data=JSON.parse(text);
 if(!data||!Array.isArray(data.data))throw Error('US Treasury debt schema mismatch');
 const amount=v=>typeof v==='string'&&/^\d+(?:\.\d{1,2})?$/.test(v)?v:null;
 const rows=data.data.slice(0,5).map(x=>{
  const date=typeof x.record_date==='string'&&/^\d{4}-\d\d-\d\d$/.test(x.record_date)?
   iso(x.record_date+'T00:00:00Z'):null;
  const total=amount(x.tot_pub_debt_out_amt),publicHeld=amount(x.debt_held_public_amt),
   intragov=amount(x.intragov_hold_amt);
  if(!date||!total||!publicHeld||!intragov)throw Error('US Treasury record has invalid date or exact decimal amounts');
  return {date,total,publicHeld,intragov};
 });
 const records=rows.map((x,i)=>record('treasury_debt','treasury_debt',
  'US Treasury reported debt '+x.date.slice(0,10),
  'Total public debt outstanding USD '+x.total+'; debt held by public USD '+x.publicHeld+
  '; intragovernmental holdings USD '+x.intragov+
  '. Published exact decimals (not floating-point calculations).',
  'https://fiscaldata.treasury.gov/datasets/debt-to-the-penny/debt-to-the-penny',
  x.date,i,{dataCategory:'published-fiscal-observation',
   totalDebtUSD:x.total,debtHeldPublicUSD:x.publicHeld,intragovUSD:x.intragov,unit:'USD'}));
 return {records,sourceCount:data.data.length,sourceTime:latest(rows.map(x=>x.date)),
  note:'Published Treasury reporting date, not a continuously updating national-debt sensor. Decimal values are preserved exactly.'};
}
function dvidsNews(text){
 const data=JSON.parse(text);
 if(!data||!Array.isArray(data.results))throw Error('DVIDS search schema mismatch');
 const rows=data.results.filter(x=>x&&x.type==='news'&&typeof x.title==='string').slice(0,12);
 const records=rows.map((x,i)=>record('dvids_news','dvids_news',x.title,
  'Published media release: '+noHtml(x.short_description||'').slice(0,300),
  /^https:\/\/www\.dvidshub\.net\/news\//.test(x.url||'')?x.url:'https://www.dvidshub.net/',
  x.date_published,i,{dataCategory:'official-published-defence-media',
  publisherUnit:clean(x.unit_name||'',80)}));
 return {records,sourceCount:Number(data.page_info?.total_results)||data.results.length,
  sourceTime:latest(records.map(x=>x.observedAt)),
  note:'DVIDS media is a publisher statement, not independently verified evidence of an occurrence.'};
}
function imfPortDaily(text){
 const data=JSON.parse(text);
 if(data?.error)throw Error('IMF ArcGIS returned an error object');
 if(!data||!Array.isArray(data.features))throw Error('IMF daily-trade table schema mismatch');
 const rows=data.features.slice(0,8).map(x=>{
  const a=x?.attributes||{};
  const date=typeof a.date==='string'&&/^\d{4}-\d\d-\d\d$/.test(a.date)?
   iso(a.date+'T00:00:00Z'):typeof a.date==='number'?iso(a.date):null;
  const calls=Number(a.portcalls),imports=Number(a.import),exports=Number(a.export);
  if(!date||typeof a.portname!=='string'||![calls,imports,exports].every(n=>Number.isFinite(n)&&n>=0))
   throw Error('IMF daily port estimate missing valid date, port or numerical observations');
  return {date,name:clean(a.portname,70),calls,imports,exports};
 });
 const records=rows.map((x,i)=>record('imf_portwatch_daily','imf_portwatch_daily',
  'Published port estimate '+x.date.slice(0,10),
  'Port: '+x.name+'; calls: '+x.calls+'; estimated imports: '+x.imports+
  ' metric tonnes; estimated exports: '+x.exports+
  ' metric tonnes. Delayed preliminary AIS-derived estimates, not vessel tracks.',
  'https://portwatch.imf.org/',x.date,i,
  {dataCategory:'delayed-published-port-trade-estimate'}));
 return {records,sourceCount:data.features.length,sourceTime:latest(records.map(x=>x.observedAt)),
  note:'A capped sample from the IMF ArcGIS table; NOT national/global totals. Requires written permission for systematic or commercial reuse.'};
}

const parse={
 faa_nas:(text)=>faaNas(text),faa_tfr:(text)=>faaTfr(JSON.parse(text)),
 nws_alerts:(text,detail)=>nws(JSON.parse(text),detail),
 fema_disasters:(text)=>fema(JSON.parse(text)),
 cisa_ics:(text)=>rss(text,'cisa_ics'),
 nrc_events:(text)=>rss(text,'nrc_events',true),
 imf_portwatch:(text)=>portwatch(JSON.parse(text)),
 noaa_swpc_kp:(text)=>swpcKp(text),
 nasdaq_halts:(text)=>nasdaqHalts(text),
 federal_register:(text)=>federalRegister(text),
 fcdo_travel:(text)=>fcdoAdvice(text),
 gdacs_alerts:(text)=>noticeRss(text,'gdacs_alerts','published-disaster-alert','GDACS last-24h public hazard alerts.'),
 uscg_lnm:(text)=>noticeRss(text,'uscg_lnm','published-maritime-notice','USCG district local notices.'),
 nasa_donki:(text)=>nasaDonki(text),
 treasury_debt:(text)=>treasuryDebt(text),
 dvids_news:(text)=>dvidsNews(text),
 imf_portwatch_daily:(text)=>imfPortDaily(text)
};
export function parseOperationalFixture(id,text,detail){
 if(!parse[id])throw Error('Unknown operational source');
 return parse[id](text,detail);
}
const MAX_BYTES=2200000;
async function boundedRead(url,{fetcher=fetch,timeoutMs=9000,limitBytes=MAX_BYTES}={}){
 const r=await fetcher(url,{cache:'no-store',signal:AbortSignal.timeout(timeoutMs),
  headers:{'User-Agent':'ASURA (public data monitoring; research@mahquantum.tech)',
   Accept:'application/json,application/geo+json,application/rss+xml,application/xml,text/xml,*/*'}});
 if(!r?.ok)throw Error('Source HTTP '+(r?.status??'unknown'));
 if(Number(r.headers?.get('content-length')||0)>limitBytes)throw Error('Source exceeds bounded payload limit');
 // Stream and enforce the cap even when the provider omits Content-Length.
 // Avoid buffering an unexpectedly huge official XML feed.
 if(!r.body?.getReader){
  const body=await r.text();
  if(Buffer.byteLength(body,'utf8')>limitBytes)throw Error('Source exceeds bounded payload limit');
  return body;
 }
 const reader=r.body.getReader(),chunks=[];
 let used=0;
 try{
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   used+=value.byteLength;
   if(used>limitBytes)throw Error('Source exceeds bounded payload limit');
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const bytes=new Uint8Array(used);let pos=0;
 for(const part of chunks){bytes.set(part,pos);pos+=part.byteLength}
 return new TextDecoder().decode(bytes);
}
export async function getOperationalSource(id,question='',opts={}){
 const definition=defFor(id);
 if(!definition)throw Error('Unknown source ID');
 let target=definition.url,requested='California (health sample)';
 const pullStartedAt=new Date().toISOString();
 let checkedAt=pullStartedAt;
 try{
  if(id==='nasdaq_halts'&&process.env.NASDAQ_HALTS_TERMS_ACCEPTED!=='true'){
   return {source:id,success:false,records:[],checkedAt,
    status:{source:id,name:definition.label,transport:'blocked',content:'unknown',
     checkedAt,sourceUrl:target,sourceTime:null,retrievedAt:null,sourceItemFresh:false,
     reason:'Nasdaq feed terms must be reviewed and accepted by an authorized operator before enabling this adapter.',
     scope:definition.scope,cadenceMinutes:definition.cadenceMinutes,
     maxContentAgeMinutes:definition.maxContentAgeMinutes,licensing:definition.licenseStatus,
     usableForOperationalClaims:false}};
  }
  if(id==='nws_alerts'&&opts.healthProbe!==true){
   const state=requestedState(question);
   if(!state)throw Error('Please specify a US state for NWS active alerts (for example: California or Texas). No location assumed.');
   target='https://api.weather.gov/alerts/active?area='+state;requested=state;
  }
  if(id==='fcdo_travel'){
   const country=opts.healthProbe===true?{name:'India',slug:'india'}:fcdoCountry(question);
   if(!country)throw Error('Specify a supported country for FCDO travel advice (for example: India, Japan, or Brazil).');
   target='https://www.gov.uk/api/content/foreign-travel-advice/'+country.slug;
   requested=country.name;
  }
  // Official CISA ICS RSS currently publishes ~6 MB of 30 full summaries;
  // the higher cap is restricted to this allowlisted source, not arbitrary URLs.
  const text=await boundedRead(target,{...opts,
   limitBytes:id==='cisa_ics'?8000000:MAX_BYTES});
  checkedAt=new Date().toISOString();
  const parsed=parseOperationalFixture(id,text,requested);
  const content=freshnessStatus(parsed.sourceTime,checkedAt,definition.maxContentAgeMinutes);
  const status={
   source:id,name:definition.label,transport:'ok',content:content.state,sourceUrl:target,pullStartedAt,
   sourceTime:parsed.sourceTime||null,retrievedAt:checkedAt,checkedAt,
   ageMinutes:content.ageMinutes,reason:content.reason,
   sourceCount:parsed.sourceCount,notes:parsed.note,
   scope:definition.scope,cadenceMinutes:definition.cadenceMinutes,
   maxContentAgeMinutes:definition.maxContentAgeMinutes,
   licensing:definition.licenseStatus,provider:definition.attribution,
   // Fresh retrieval does not grant operational approval, legal licence or
   // validation. Only a documented human release board can change this flag.
   sourceItemFresh:content.state==='fresh'&&id!=='imf_portwatch'&&definition.licenseStatus!=='provider-terms-review-required',
   usableForOperationalClaims:false
  };
  const records=parsed.records.map((x,i)=>({
   ...x,id:id+':'+(i+1),retrievedAt:checkedAt,sourceUrl:target,licensing:definition.licenseStatus,
   freshness:content.state,sourceTime:parsed.sourceTime||null
  }));
  const digest=createHash('sha256').update(JSON.stringify({id,checkedAt,status,records})).digest('hex');
  return {source:id,success:true,provider:definition.attribution,records,
   status,checkedAt,sha256:digest,rawSha256:createHash('sha256').update(text).digest('hex')};
 }catch(e){
  checkedAt=new Date().toISOString();
  return {source:id,success:false,records:[],checkedAt,
   status:{source:id,name:definition.label,transport:'down',content:'unknown',sourceUrl:target,pullStartedAt,
    checkedAt,retrievedAt:null,sourceTime:null,
    reason:clean(e.message,170),scope:definition.scope,cadenceMinutes:definition.cadenceMinutes,
    maxContentAgeMinutes:definition.maxContentAgeMinutes,licensing:definition.licenseStatus,
    sourceItemFresh:false,usableForOperationalClaims:false}};
 }
}
export async function probeOperationalSources(selected=OPERATIONAL_SOURCE_IDS,opts={}){
 const allowed=[...new Set(selected)].filter(x=>OPERATIONAL_SOURCE_IDS.includes(x)).slice(0,16);
 const results=await Promise.all(allowed.map(id=>getOperationalSource(id,'',{...opts,healthProbe:true})));
 return {checkedAt:new Date().toISOString(),
  coverage:'On-demand independent checks; no continuous uptime claim or durable audit log',
  sources:results.map(x=>({...x.status,recordCount:x.records.length,sha256:x.sha256||null,rawSha256:x.rawSha256||null})),
  evidencePacks:results.map(x=>({
   source:x.source,checkedAt:x.checkedAt,status:x.status,
   records:x.records,sha256:x.sha256||null,rawSha256:x.rawSha256||null
  })),
  freshItemCount:results.filter(x=>x.status?.sourceItemFresh).length,
  readyCount:0, // operational acceptance is never inferred from live probing
  checkCount:results.length,checksNotCertification:true};
}
