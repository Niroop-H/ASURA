/** Public and read-only cross-sector evidence, no synthetic or private feeds. */
const now=()=>new Date().toISOString();
const trim=(x,n=400)=>String(x??'').replace(/\s+/g,' ').slice(0,n);
const evidence=(kind,provider,title,description,url,observedAt,i,type)=>({
 id:kind+':'+(i+1),source:kind,provider,title:trim(title,180),
 description:trim(description,700),url,observedAt:observedAt||null,
 retrievedAt:now(),dataCategory:type||kind,operationVerified:false
});
async function getJson(url,maxBytes=2700000){
 const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(11000),
  headers:{Accept:'application/json','User-Agent':'ASURA/1.0 public data research'}});
 if(!r.ok)throw Error('Public source HTTP '+r.status);
 if(Number(r.headers.get('content-length')||0)>maxBytes)throw Error('Data size limit exceeded');
 const reader=r.body?.getReader();
 if(!reader)return r.json();
 let chunks=[],size=0;
 try{
  while(true){
   const {done,value}=await reader.read();if(done)break;
   size+=value.byteLength;if(size>maxBytes)throw Error('Data size limit exceeded');
   chunks.push(value);
  }
 }finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let p=0;
 for(const x of chunks){bytes.set(x,p);p+=x.byteLength;}
 return JSON.parse(new TextDecoder().decode(bytes));
}
const countries={
 'united states':'US',america:'US',usa:'US',us:'US',india:'IN',china:'CN',
 japan:'JP','united kingdom':'GB',uk:'GB',britain:'GB',germany:'DE',france:'FR',
 brazil:'BR',russia:'RU','south korea':'KR',nigeria:'NG',
 'south africa':'ZA',australia:'AU',canada:'CA',indonesia:'ID',
 singapore:'SG',pakistan:'PK',bangladesh:'BD','saudi arabia':'SA',
 'united arab emirates':'AE',uae:'AE',italy:'IT',spain:'ES',
 mexico:'MX',argentina:'AR',egypt:'EG'
};
const indicators=[
 [/military (?:spending|expenditure)|defen[sc]e spending/i,'MS.MIL.XPND.GD.ZS','Military spending (% GDP)','% GDP'],
 [/unemployment|jobless/i,'SL.UEM.TOTL.ZS','Unemployment rate','%'],
 [/inflation|consumer prices|cpi/i,'FP.CPI.TOTL.ZG','Inflation, consumer prices (annual)','%'],
 [/life expectancy/i,'SP.DYN.LE00.IN','Life expectancy at birth','years'],
 [/population|inhabitants/i,'SP.POP.TOTL','Population','people'],
 [/gdp per capita/i,'NY.GDP.PCAP.CD','GDP per capita','current US$'],
 [/gdp|gross domestic product|economy of/i,'NY.GDP.MKTP.CD','GDP','current US$']
];
function getCountries(q){
 const found=Object.entries(countries).filter(([name])=>
  new RegExp('(?:^|[^a-z])'+name.replace(/\s+/g,'\\s+')+'(?:$|[^a-z])','i').test(q))
  .sort((a,b)=>b[0].length-a[0].length);
 return [...new Set(found.map(x=>x[1]))].slice(0,3);
}
async function economy(q){
 const [re,indicator,label,unit]=indicators.find(row=>row[0].test(q))||indicators[6];
 const selected=getCountries(q);
 if(!selected.length)throw Error('Specify a country for the World Bank indicator, e.g. GDP of India.');
 const work=await Promise.allSettled(selected.map(async code=>{
  const url='https://api.worldbank.org/v2/country/'+code+'/indicator/'+indicator+'?format=json&per_page=15';
  const d=await getJson(url,250000);
  const rows=Array.isArray(d?.[1])?d[1]:[];
  return rows.filter(x=>Number.isFinite(x.value)).slice(0,3).map((x,i)=>
   evidence('economy','World Bank WDI',
    (x.country?.value||code)+' — '+label+' ('+x.date+')',
    'Value '+x.value.toLocaleString('en-US',{maximumFractionDigits:5})+' '+unit+
    '. Annual observation; source vintage '+(d[0]?.lastupdated||'unreported')+
    '. Data may be revised.',url,x.date+'-01-01',i,'historical-country-statistic'));
 }));
 const records=work.filter(x=>x.status==='fulfilled').flatMap(x=>x.value)
  .map((x,i)=>({...x,id:'economy:'+(i+1)}));
 if(!records.length)throw Error('No recent published values were available for the requested country.');
 return {provider:'World Bank WDI',records,note:'Annual, revised country statistics. Not real-time economics.'};
}
const supported=new Set(['USD','EUR','INR','GBP','JPY','CNY','AED','CAD','AUD','CHF','SGD','BRL','KRW','ZAR']);
const currencies={'us dollar':'USD',dollar:'USD','indian rupee':'INR',rupee:'INR',euro:'EUR',
 pound:'GBP',yen:'JPY',dirham:'AED'};
async function fx(q){
 let codes=(q.match(/\b[A-Z]{3}\b/g)||[]).filter(x=>supported.has(x));
 for(const [phrase,code] of Object.entries(currencies))
  if(new RegExp('(?:^|\\W)'+phrase+'(?:$|\\W)','i').test(q))codes.push(code);
 codes=[...new Set(codes)];
 if(codes.length<2)throw Error('Provide two currency codes, e.g. USD to INR.');
 const [base,quote]=codes;
 const url='https://api.frankfurter.dev/v2/rates?base='+base+'&quotes='+quote;
 const data=await getJson(url,100000);
 const row=Array.isArray(data)?data.find(x=>x.base===base&&x.quote===quote):null;
 if(!row||!Number.isFinite(row.rate))throw Error('Reference exchange rate unavailable for '+base+' to '+quote);
 const amount=q.match(/\b(\d+(?:\.\d+)?)\s*(?:USD|INR|EUR|GBP|JPY|AED)\b/i)?.[1];
 return {provider:'Frankfurter reference exchange rates',
  records:[evidence('fx','Frankfurter central-bank reference rates',
   base+' → '+quote+' = '+row.rate+' ('+row.date+')',
   '1 '+base+' = '+row.rate+' '+quote+'. Published on '+row.date+'.'+
    (amount?' '+amount+' '+base+' ≈ '+(Number(amount)*row.rate).toFixed(4)+' '+quote+'.':'')+
    ' Reference rate, not live executable market pricing.',
   'https://frankfurter.dev/',row.date+'T00:00:00Z',0,'daily-reference-rate')],
  note:'Central-bank reference rates; not intraday market tick data.'};
}
async function cyber(q){
 const url='https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
 const d=await getJson(url,3500000);
 const all=Array.isArray(d.vulnerabilities)?d.vulnerabilities:[];
 const id=q.match(/\bCVE-\d{4}-\d{4,8}\b/i)?.[0]?.toUpperCase();
 const rows=id?all.filter(x=>x.cveID===id):
  all.slice().sort((a,b)=>String(b.dateAdded).localeCompare(String(a.dateAdded))).slice(0,8);
 return {provider:'CISA KEV',records:rows.map((x,i)=>evidence('cyber','CISA KEV',
  x.cveID+' — '+x.vendorProject+' '+x.product,
  x.vulnerabilityName+'. Date added: '+x.dateAdded+
   '. Defensive remediation: '+(x.requiredAction||'See CISA notice')+
   '. Required remediation due date: '+(x.dueDate||'not specified')+'.',
  'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
  x.dateAdded+'T00:00:00Z',i,'defensive-advisory')),
  note:'CISA official known-exploited catalogue; no exploit code. Catalog '+(d.catalogVersion||'version not provided')+'.'};
}
async function space(q){
 if(!/\b(?:iss|zarya|international space station|tiangong|space station|orbital elements|celestrak|tle)\b/i.test(q))
  throw Error('CelesTrak connector currently covers public space-station orbital elements, not all satellites.');
 const url='https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=JSON';
 let rows=await getJson(url,250000);
 if(!Array.isArray(rows))throw Error('Invalid orbital element response');
 if(/\b(?:iss|zarya|international space station)\b/i.test(q))
  rows=rows.filter(x=>x.NORAD_CAT_ID===25544);
 else if(/tiangong|chinese space station/i.test(q))
  rows=rows.filter(x=>/TIANHE|TIANGONG|SHENZHOU/i.test(x.OBJECT_NAME));
 return {provider:'CelesTrak public orbital data',
  records:rows.slice(0,6).map((x,i)=>evidence('space','CelesTrak',
   x.OBJECT_NAME+' (NORAD '+x.NORAD_CAT_ID+')',
   'GP epoch '+x.EPOCH+'; inclination '+x.INCLINATION+
   ' degrees; mean motion '+x.MEAN_MOTION+' rev/day. Orbital element set, not live image or mission inference.',
   url,x.EPOCH,i,'orbital-elements')),
  note:'Public general perturbations elements, not real-time satellite imagery or verified tracking.'};
}
function entityName(q){
 return q.replace(/\b(?:what is|tell me|find|show|search|lookup|check|latest|current|registered|legal|corporate|company|business|entity|firm|lei|legal entity identifier|registration|details|information|of|for|about|please|the|a|is|are|and|ownership)\b/ig,' ')
  .replace(/[^\p{L}\p{N} &.'-]/gu,' ').replace(/\s+/g,' ').trim().slice(0,80);
}
async function business(q){
 const name=entityName(q);
 if(name.length<3)throw Error('Specify a registered company name for GLEIF LEI search.');
 const url='https://api.gleif.org/api/v1/lei-records?filter%5Bfulltext%5D='+
  encodeURIComponent(name)+'&page%5Bsize%5D=5';
 const d=await getJson(url,260000);
 const records=(Array.isArray(d.data)?d.data:[]).map((x,i)=>{
  const a=x.attributes||{},e=a.entity||{},addr=e.legalAddress||{};
  return evidence('business','GLEIF Golden Copy',
   e.legalName?.name||'Unlabelled legal entity',
   'LEI '+(a.lei||x.id)+'; registration status: '+(e.status||'unknown')+
   '; jurisdiction '+(e.jurisdiction||'unknown')+
   '; listed address: '+[addr.city,addr.country].filter(Boolean).join(', ')+
   '. LEI reference record does not verify ownership or solvency.',
   'https://search.gleif.org/#/record/'+encodeURIComponent(x.id),
   d.meta?.goldenCopy?.publishDate||null,i,'company-registry');
 });
 return {provider:'GLEIF',records,providerTime:d.meta?.goldenCopy?.publishDate||null,
  note:'Fuzzy entity matches; verify the legal entity name and jurisdiction.'};
}
async function reference(q){
 const term=q.replace(/\b(?:tell me about|identify|who is|what is|give details about|wikidata|search|lookup|the|a|an|please)\b/ig,' ')
  .replace(/[?!.,]/g,' ').replace(/\s+/g,' ').trim().slice(0,85);
 if(term.length<2)throw Error('Specify a named place or entity to look up.');
 const url='https://www.wikidata.org/w/api.php?action=wbsearchentities&search='+
  encodeURIComponent(term)+'&language=en&format=json&limit=5';
 const d=await getJson(url,110000);
 return {provider:'Wikidata',records:(Array.isArray(d.search)?d.search:[]).map((x,i)=>
  evidence('reference','Wikidata',
   (x.label||'Unlabelled')+' ('+x.id+')',
   (x.description||'Description unavailable')+'. Community reference metadata, not verified current facts.',
   'https://www.wikidata.org/wiki/'+x.id,null,i,'reference-entity')),
  note:'Community-maintained search; confirm changing officeholders and claims with official current sources.'};
}
export const PUBLIC_INTELLIGENCE_SOURCES=['economy','fx','cyber','space','business','reference'];
export async function getPublicIntelligence(source,q){
 switch(source){
  case 'economy':return economy(q);
  case 'fx':return fx(q);
  case 'cyber':return cyber(q);
  case 'space':return space(q);
  case 'business':return business(q);
  case 'reference':return reference(q);
  default:throw Error('Unsupported public connector');
 }
}
