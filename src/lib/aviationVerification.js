/**
 * Accuracy-first flight-arrival query handling.
 *
 * ADS-B observations are NOT airport arrival events. A current airport flight
 * board requires licensed flight-status data. Never derive actual landings from
 * aircraft proximity, altitude, groundspeed or callsign.
 */
import {getAirportBoard,hasLicensedFlightAware,flightAwareUnavailable} from '@/lib/flightOperations';

const AIRPORTS=[
 {icao:'VOBL',iata:'BLR',name:'Kempegowda International Airport',city:'Bengaluru',
  timezone:'Asia/Kolkata',lat:13.1986,lon:77.7066,
  aliases:[/\bkempegowda\b/i,/\bbengaluru (?:international )?airport\b/i,/\bbangalore (?:international )?airport\b/i,/\bblr(?: airport)?\b/i,/\bvobl\b/i],
  publicArrivalsUrl:'https://data.flightradar24.com/data/airports/blr/arrivals'},
 {icao:'VIDP',iata:'DEL',name:'Indira Gandhi International Airport',city:'Delhi',
  timezone:'Asia/Kolkata',lat:28.5562,lon:77.1000,
  aliases:[/\bindira gandhi\b/i,/\bdelhi airport\b/i,/\bdel(?: airport)?\b/i,/\bvidp\b/i],
  publicArrivalsUrl:'https://data.flightradar24.com/data/airports/del/arrivals'},
 {icao:'VABB',iata:'BOM',name:'Chhatrapati Shivaji Maharaj International Airport',city:'Mumbai',
  timezone:'Asia/Kolkata',lat:19.0896,lon:72.8656,
  aliases:[/\bchhatrapati shivaji\b/i,/\bmumbai airport\b/i,/\bbom(?: airport)?\b/i,/\bvabb\b/i],
  publicArrivalsUrl:'https://data.flightradar24.com/data/airports/bom/arrivals'},
 {icao:'VOHS',iata:'HYD',name:'Rajiv Gandhi International Airport',city:'Hyderabad',
  timezone:'Asia/Kolkata',lat:17.2403,lon:78.4294,
  aliases:[/\brajiv gandhi international airport\b/i,/\bhyderabad airport\b/i,/\bhyd(?: airport)?\b/i,/\bvohs\b/i],
  publicArrivalsUrl:'https://data.flightradar24.com/data/airports/hyd/arrivals'},
 {icao:'VOMM',iata:'MAA',name:'Chennai International Airport',city:'Chennai',
  timezone:'Asia/Kolkata',lat:12.9941,lon:80.1709,
  aliases:[/\bchennai airport\b/i,/\bmaa(?: airport)?\b/i,/\bvomm\b/i],
  publicArrivalsUrl:'https://data.flightradar24.com/data/airports/maa/arrivals'},
 {icao:'EGLL',iata:'LHR',name:'Heathrow Airport',city:'London',
  timezone:'Europe/London',lat:51.4700,lon:-0.4543,
  aliases:[/\bheathrow\b/i,/\blhr\b/i,/\begll\b/i],
  publicArrivalsUrl:'https://data.flightradar24.com/data/airports/lhr/arrivals'},
 {icao:'WSSS',iata:'SIN',name:'Singapore Changi Airport',city:'Singapore',
  timezone:'Asia/Singapore',lat:1.3644,lon:103.9915,
  aliases:[/\bchangi\b/i,/\bsingapore airport\b/i,/\bwsss\b/i],
  publicArrivalsUrl:'https://data.flightradar24.com/data/airports/sin/arrivals'},
 {icao:'OMDB',iata:'DXB',name:'Dubai International Airport',city:'Dubai',
  timezone:'Asia/Dubai',lat:25.2532,lon:55.3657,
  aliases:[/\bdubai airport\b/i,/\bdxb\b/i,/\bomdb\b/i],
  publicArrivalsUrl:'https://data.flightradar24.com/data/airports/dxb/arrivals'},
];
const arrivalLanguage=/\b(arrivals?|arriv(?:ing|ed|es?)|land(?:ing|ed|s)?|touch(?:down|downs)|flight board|flight status|scheduled (?:to arrive|arrival)|departures?|takeoffs?)\b/i;
const arrivalSpecific=/\b(arrivals?|arriv(?:ing|ed|es?)|land(?:ing|ed|s)?|touch(?:down|downs)|scheduled (?:to arrive|arrival))\b/i;
const departures=/\b(departures?|depart(?:ing|ed|s)?|takeoffs?)\b/i;
const localDate=(v,timezone)=>{
 const d=new Date(v);
 if(!Number.isFinite(d.getTime()))return null;
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:timezone,
  year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).map(p=>[p.type,p.value]));
 return [parts.year,parts.month,parts.day].join('-');
};
const localTime=(v,timezone)=>{
 if(!v||!Number.isFinite(Date.parse(v)))return 'Not reported';
 return new Intl.DateTimeFormat('en-GB',{timeZone:timezone,day:'2-digit',month:'short',
  hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(v));
};
const clean=value=>String(value||'').replace(/[\n\r|]/g,' ').slice(0,100);
export function identifyAirport(query){
 return AIRPORTS.find(a=>a.aliases.some(re=>re.test(query)))||null;
}
export function airportArrivalIntent(question){
 const input=String(question||'');
 if(!arrivalLanguage.test(input))return null;
 const airport=identifyAirport(input);
 if(!airport)return null;
 const mode=departures.test(input)&&!arrivalSpecific.test(input)?'departures':'arrivals';
 const delta=/\btomorrow\b/i.test(input)?1:/\byesterday\b/i.test(input)?-1:0;
 const explicit=input.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
 const explicitDate=explicit?explicit[0]:null;
 const requestedDate=explicitDate||
  localDate(new Date(Date.now()+delta*86400000),airport.timezone);
 return {airport,mode,requestedDate};
}
const record=(f,i,airport,checkedAt,mode)=>{
 const actual=mode==='departures'?f.actualDeparture:f.actualArrival;
 const estimated=mode==='departures'?f.estimatedDeparture:f.estimatedArrival;
 const scheduled=mode==='departures'?f.scheduledDeparture:f.scheduledArrival;
 const event=actual?'Actual reported':f.cancelled?'Cancelled':f.diverted?'Diverted':
  estimated?'Estimated / not confirmed':'Scheduled / not confirmed';
 const reference=f.faFlightId
  ?'https://www.flightaware.com/live/flight/id/'+encodeURIComponent(f.faFlightId):null;
 const eventTime=actual||estimated||scheduled;
 return {id:(mode==='departures'?'departures:':'arrivals:')+(i+1),
  source:'flight-status',provider:'FlightAware AeroAPI',
  title:clean(f.callsign||'Flight identifier unavailable'),
  description:[
   mode==='departures'?'Origin '+airport.icao:'Destination '+airport.icao,
   mode==='departures'?'To '+clean(f.destination||'unknown'):'From '+clean(f.origin||'unknown'),
   event,
   'Scheduled '+localTime(scheduled,airport.timezone),
   estimated?'Estimated '+localTime(estimated,airport.timezone):null,
   actual?'Provider actual '+localTime(actual,airport.timezone):null,
  ].filter(Boolean).join(' · '),
  observedAt:actual||null,retrievedAt:checkedAt,url:reference,
  flightStatus:event,
  scheduledAt:scheduled||null,estimatedAt:estimated||null,actualAt:actual||null,
  sourceCategory:'flight-operations',
  eventConfirmed:Boolean(actual)&&!f.cancelled&&!f.diverted,
  airport:airport.icao,airportTimezone:airport.timezone};
};
function unavailableAnswer(intent,error){
 const {airport,mode,requestedDate}=intent;
 const boardName=mode==='arrivals'?'arrivals':'departures';
 const reason=error||'No authorized flight-operations provider is connected.';
 const answer=[
  '### '+airport.name+' ('+airport.iata+' / '+airport.icao+') — '+boardName+' on '+requestedDate,
  '',
  '**Verified '+boardName+' are unavailable in ASURA right now.**',
  '',
  'The connected ADS-B receiver feed reports aircraft positions, not confirmed airport '+boardName+'. Being near the airport, descending or transmitting a callsign does **not** establish a landing, departure, or scheduled service.',
  '',
  '**Data connection needed:** '+reason,
  '',
  'You can inspect an external flight-status board here: [Airport '+boardName+' board]('+airport.publicArrivalsUrl.replace('/arrivals','/'+boardName)+'). Information on that site is independently provided and has **not** been imported or verified by ASURA.',
  '',
  'DEVASHRI will only provide an arrivals/departures list once an authorized provider returns airport-specific flight-status records with actual, estimated or scheduled times.',
 ].join('\n');
 return {success:true,answer,answerType:'verified-data-unavailable',
  dataVerification:'unavailable',provider:'ASURA verified availability gate',model:null,
  records:[],statuses:[{source:'flight-status',success:false,error:reason,
   provider:'FlightAware AeroAPI',note:'No airport flight-status record verified.'}],
  airport:{icao:airport.icao,iata:airport.iata,name:airport.name,timezone:airport.timezone,date:requestedDate},
  checkedAt:new Date().toISOString(),generatedAt:new Date().toISOString(),
  externalBoardUrl:airport.publicArrivalsUrl.replace('/arrivals','/'+boardName)};
}
export async function verifiedAirportBoardAnswer(intent){
 if(!hasLicensedFlightAware()){
  const unavailable=flightAwareUnavailable();
  return unavailableAnswer(intent,unavailable.error);
 }
 const {airport,mode,requestedDate}=intent;
 const plans=mode==='arrivals'?['arrivals','scheduled_arrivals']:['departures','scheduled_departures'];
 const statuses=await Promise.all(plans.map(async board=>{
  try{return {board,result:await getAirportBoard(airport.icao,board)};}
  catch(e){return {board,result:{success:false,error:e.message}};}
 }));
 const working=statuses.filter(x=>x.result?.success);
 if(!working.length)return unavailableAnswer(intent,statuses.map(s=>s.board+': '+String(s.result.error||'unavailable')).join('; '));
 const all=new Map();
 for(const item of working){
  for(const f of item.result.flights||[]){
   const date=localDate(mode==='arrivals'?(f.actualArrival||f.scheduledArrival||f.estimatedArrival):(f.actualDeparture||f.scheduledDeparture||f.estimatedDeparture),airport.timezone);
   if(date!==requestedDate)continue;
   const key=f.faFlightId||[f.callsign,mode==='arrivals'?f.scheduledArrival:f.scheduledDeparture].join(':');
   if(!all.has(key)||item.board===mode)all.set(key,f);
  }
 }
 const list=[...all.values()].sort((a,b)=>{
  const x=mode==='arrivals'?(a.actualArrival||a.estimatedArrival||a.scheduledArrival):(a.actualDeparture||a.estimatedDeparture||a.scheduledDeparture);
  const y=mode==='arrivals'?(b.actualArrival||b.estimatedArrival||b.scheduledArrival):(b.actualDeparture||b.estimatedDeparture||b.scheduledDeparture);
  return String(x||'').localeCompare(String(y||''));
 }).slice(0,28);
 const checkedAt=new Date().toISOString();
 const rows=list.map((f,i)=>record(f,i,airport,checkedAt,mode));
 const dateTime=new Intl.DateTimeFormat('en-GB',{timeZone:airport.timezone,dateStyle:'medium',timeStyle:'short'}).format(new Date());
 const table=['| Flight | '+(mode==='arrivals'?'From':'To')+' | Scheduled | Estimated | Actual | Status |',
  '|---|---|---|---|---|---|'];
 for(const f of list){
  const actual=mode==='arrivals'?f.actualArrival:f.actualDeparture;
  const estimated=mode==='arrivals'?f.estimatedArrival:f.estimatedDeparture;
  const scheduled=mode==='arrivals'?f.scheduledArrival:f.scheduledDeparture;
  const label=f.cancelled?'Cancelled':f.diverted?'Diverted':actual?'Actual reported':estimated?'Estimated':'Scheduled';
  table.push('| '+clean(f.callsign||'—')+' | '+clean((mode==='arrivals'?f.origin:f.destination)||'—')+
   ' | '+localTime(scheduled,airport.timezone)+' | '+localTime(estimated,airport.timezone)+
   ' | '+localTime(actual,airport.timezone)+' | '+label+' |');
 }
 const answer=[
  '### '+airport.name+' ('+airport.iata+' / '+airport.icao+') — '+mode+' on '+requestedDate,
  '',
  '**Source:** FlightAware AeroAPI (licensed provider), checked '+dateTime+' ('+airport.timezone+').',
  '',
  list.length?table.join('\n'):'No matching provider records were returned for the requested local date. This does **not** prove there were no flights.',
  '',
  '**Verification:** Only flights with a provider-reported **actual** event time are confirmed as '+(mode==='arrivals'?'landed':'departed')+'. Scheduled and estimated entries are not confirmed events.',
  '',
  '**Completeness:** First provider page for recent and scheduled flights; codeshares, data latency, incomplete pagination and operator corrections can affect the list. This is not a complete airport operations log.',
 ].join('\n');
 return {success:true,answer,answerType:'provider-verified-operations',
  dataVerification:'provider-reported-partial',provider:'FlightAware AeroAPI',
  checkedAt,generatedAt:checkedAt,records:rows,model:null,
  statuses:statuses.map(s=>({source:s.board,success:Boolean(s.result.success),
   provider:'FlightAware AeroAPI',error:s.result.success?null:s.result.error,
   providerCount:s.result.success?s.result.count:null,
   note:'Provider page only. '+(s.result.note||'')})),
  airport:{icao:airport.icao,iata:airport.iata,name:airport.name,timezone:airport.timezone,date:requestedDate}};
}
