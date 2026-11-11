/**
 * Worldwide geocoding and point-weather data.
 * Server-only OpenWeather calls; keys are never passed to the browser.
 *
 * "Current" OpenWeather records are provider-model/observation blends and may
 * be updated only about every 10 minutes. A forecast is a prediction and must
 * never be presented as a directly observed station reading.
 */
const base='https://api.openweathermap.org';
const apiKey=()=>String(process.env.OPENWEATHERMAP_API_KEY||'').trim();
const finite=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
const limit=(n,min,max)=>Math.max(min,Math.min(max,n));
const coordOk=(lat,lon)=>finite(lat,-90,90)&&finite(lon,-180,180);
const round=(n,digits=1)=>typeof n==='number'&&Number.isFinite(n)?Number(n.toFixed(digits)):null;
const isoTime=seconds=>Number.isFinite(seconds)&&seconds>0?new Date(seconds*1000).toISOString():null;
const safeLabel=(v,max=120)=>String(v||'').replace(/[<>]/g,'').slice(0,max).trim();
const period=(unix,offset)=>new Date((unix+offset)*1000).toISOString().slice(0,10);
const local=(unix,offset)=>new Date((unix+offset)*1000).toISOString().slice(0,16);
const summary=(code)=>code>=200&&code<300?'Thunderstorm':
 code>=300&&code<400?'Drizzle':
 code>=500&&code<600?'Rain':
 code>=600&&code<700?'Snow':
 code>=700&&code<800?'Atmospheric haze / fog':
 code===800?'Clear':code>800&&code<900?'Clouds':'Conditions not classified';
async function getJson(url,{cache=600,timeout=10000}={}){
 const response=await fetch(url,{next:{revalidate:cache},
  signal:AbortSignal.timeout(timeout),headers:{Accept:'application/json',
   'User-Agent':'ASURA/1.0 Weather Explorer (research@mahquantum.tech)'}});
 if(!response.ok){
  const code=response.status;
  throw new Error('OpenWeather HTTP '+code+(code===401?' — invalid or inactive API key':
   code===429?' — rate limit reached':code===404?' — no matching location':''));
 }
 return response.json();
}
export function validateWeatherCoordinate(lat,lon){
 if(!coordOk(lat,lon))throw new Error('Coordinates must be a valid latitude (−90 to 90) and longitude (−180 to 180)');
 return {lat:Number(lat.toFixed(4)),lon:Number(lon.toFixed(4))};
}
export async function searchWorldwideLocations(rawQuery,{country='',count=5}={}){
 if(!apiKey())throw new Error('OPENWEATHERMAP_API_KEY is not configured');
 const query=safeLabel(rawQuery,90);
 if(query.length<2)throw new Error('Enter at least two characters for a city, district, state or place');
 if(country!==''&&!/^[A-Za-z]{2}$/.test(country))throw new Error('Use a valid two-letter country code');
 const u=new URL('/geo/1.0/direct',base);
 const cc=country.toUpperCase();
 const tail=','+cc;
 const scopedQuery=cc&&!query.toUpperCase().endsWith(tail)?query+tail:query;
 u.searchParams.set('q',scopedQuery);
 u.searchParams.set('limit',String(limit(Math.trunc(count)||5,1,5)));
 u.searchParams.set('appid',apiKey());
 const result=await getJson(u,{cache:86400,timeout:9000});
 if(!Array.isArray(result))throw new Error('Unexpected geocoding provider response');
 const locations=result.filter(x=>coordOk(x.lat,x.lon)).map(x=>({
  id:[round(x.lat,4),round(x.lon,4),safeLabel(x.country,2)].join(':'),
  name:safeLabel(x.name,100),state:safeLabel(x.state,90)||null,
  country:safeLabel(x.country,2),countryCode:safeLabel(x.country,2),
  lat:round(x.lat,4),lon:round(x.lon,4),
  label:[safeLabel(x.name,100),safeLabel(x.state,90),safeLabel(x.country,2)]
   .filter(Boolean).join(', '),
  localName:safeLabel(x.local_names?.en||'',100)||null,
 }));
 const filtered=cc?locations.filter(x=>x.country.toUpperCase()===cc):locations;
 return {success:true,provider:'OpenWeather Geocoding API',searched:query,count:filtered.length,
  locations:filtered,retrievedAt:new Date().toISOString(),
  note:'Geocoding matches are candidate coordinates, not a complete list of every district or state. Select the correct place before fetching weather.'};
}
function normalizeCurrent(data,lat,lon){
 if(!Number.isFinite(data?.dt)||!Number.isFinite(data?.main?.temp))
  throw new Error('OpenWeather current weather response missing observation time or temperature');
 const time=isoTime(data.dt);
 const ageMinutes=Math.max(0,Math.round((Date.now()-data.dt*1000)/60000));
 if(data.dt*1000>Date.now()+10*60000)throw new Error('Weather provider returned an implausible future timestamp');
 return {type:'current-provider-weather',observedAt:time,ageMinutes,
  stale:ageMinutes>90,temperatureC:round(data.main.temp),feelsLikeC:round(data.main.feels_like),
  humidityPercent:round(data.main.humidity,0),pressureHpa:round(data.main.pressure,0),
  visibilityMeters:round(data.visibility,0),cloudCoverPercent:round(data.clouds?.all,0),
  windKmh:round(Number.isFinite(data.wind?.speed)?data.wind.speed*3.6:null),
  gustKmh:round(Number.isFinite(data.wind?.gust)?data.wind.gust*3.6:null),
  windDegrees:round(data.wind?.deg,0),weatherCode:Number.isFinite(data.weather?.[0]?.id)?data.weather[0].id:null,
  description:safeLabel(data.weather?.[0]?.description||'Conditions unavailable',100),
  sunriseAt:isoTime(data.sys?.sunrise),sunsetAt:isoTime(data.sys?.sunset),
  name:safeLabel(data.name,100),country:safeLabel(data.sys?.country,2),
  lat:round(data.coord?.lat??lat,4),lon:round(data.coord?.lon??lon,4)};
}
function normalizeForecast(data){
 if(!Array.isArray(data?.list)||!data.list.length)throw new Error('No five-day forecast intervals returned');
 const tz=finite(data.city?.timezone,-50400,50400)?data.city.timezone:0;
 const hourly=data.list.filter(x=>Number.isFinite(x.dt)&&Number.isFinite(x.main?.temp))
  .slice(0,40).map(x=>({
   at:isoTime(x.dt),localDate:period(x.dt,tz),localTime:local(x.dt,tz),
   temperatureC:round(x.main.temp),feelsLikeC:round(x.main.feels_like),
   humidityPercent:round(x.main.humidity,0),
   precipitationProbabilityPercent:round(Number.isFinite(x.pop)?x.pop*100:null,0),
   rainMm3h:round(x.rain?.['3h']),snowMm3h:round(x.snow?.['3h']),
   windKmh:round(Number.isFinite(x.wind?.speed)?x.wind.speed*3.6:null),
   weatherCode:Number.isFinite(x.weather?.[0]?.id)?x.weather[0].id:null,
   description:safeLabel(x.weather?.[0]?.description||'Unspecified',95),
  }));
 const days=new Map();
 for(const x of hourly){
  if(!days.has(x.localDate))days.set(x.localDate,[]);
  days.get(x.localDate).push(x);
 }
 const daily=[...days].map(([date,rows])=>({
  date,samples:rows.length,
  sampledMinC:round(Math.min(...rows.map(x=>x.temperatureC))),
  sampledMaxC:round(Math.max(...rows.map(x=>x.temperatureC))),
  maxPrecipitationProbabilityPercent:Math.max(...rows.map(x=>x.precipitationProbabilityPercent??0)),
  rainMmAcrossIntervals:round(rows.reduce((sum,x)=>sum+(x.rainMm3h??0),0)),
  weatherDescription:rows[Math.floor(rows.length/2)]?.description||'Forecast',
  partial:rows.length<7,
 }));
 return {forecast:hourly,daily,timezoneOffsetSeconds:tz,timezoneName:'UTC'+
  (tz>=0?'+':'-')+String(Math.floor(Math.abs(tz)/3600)).padStart(2,'0')+':'+
  String(Math.floor(Math.abs(tz)%3600/60)).padStart(2,'0'),
  source:'OpenWeather 5-day/3-hour forecast'};
}
export async function getWorldwideWeather(rawLat,rawLon,{label='',state='',country=''}={}){
 const {lat,lon}=validateWeatherCoordinate(rawLat,rawLon);
 if(!apiKey())throw new Error('OPENWEATHERMAP_API_KEY is not configured');
 const u=(path)=>{
  const url=new URL(path,base);
  url.searchParams.set('lat',String(lat));url.searchParams.set('lon',String(lon));
  url.searchParams.set('appid',apiKey());url.searchParams.set('units','metric');
  url.searchParams.set('lang','en');
  return url;
 };
 const [currentRaw,forecastRaw]=await Promise.allSettled([
  getJson(u('/data/2.5/weather'),{cache:600,timeout:10500}),
  getJson(u('/data/2.5/forecast'),{cache:1800,timeout:12000}),
 ]);
 if(currentRaw.status==='rejected'&&forecastRaw.status==='rejected')
  throw new Error('Current weather and forecast both unavailable: '+
   String(currentRaw.reason?.message||'current failed').slice(0,120)+'; '+
   String(forecastRaw.reason?.message||'forecast failed').slice(0,120));
 const errors=[];
 let current=null,forecastData=null;
 if(currentRaw.status==='fulfilled'){
  try{current=normalizeCurrent(currentRaw.value,lat,lon);}
  catch(e){errors.push('Current weather: '+e.message);}
 }else errors.push('Current weather: '+String(currentRaw.reason?.message||'unavailable'));
 if(forecastRaw.status==='fulfilled'){
  try{forecastData=normalizeForecast(forecastRaw.value);}
  catch(e){errors.push('Forecast: '+e.message);}
 }else errors.push('Forecast: '+String(forecastRaw.reason?.message||'unavailable'));
 if(!current&&!forecastData)throw new Error(errors.join('; ').slice(0,340));
 const location={lat,lon,name:safeLabel(label,150)||current?.name||'Selected coordinates',
  state:safeLabel(state,95)||null,country:safeLabel(country,80)||current?.country||null,
  coordinateType:'single point'};
 const retrievedAt=new Date().toISOString();
 return {success:true,provider:'OpenWeather',
  dataType:'current provider weather + 3-hour forecast model (not continuous sensor feed)',
  retrievedAt,location,current,
  hourly:forecastData?.forecast||[],daily:forecastData?.daily||[],
  timezoneOffsetSeconds:forecastData?.timezoneOffsetSeconds??(currentRaw.status==='fulfilled'?
    currentRaw.value.timezone??0:0),
  timezoneName:forecastData?.timezoneName||null,
  sourceStatuses:{current:current?'available':'unavailable',
   forecast:forecastData?'available':'unavailable'},
  errors,
  attribution:'Weather data: OpenWeather. Forecasts are predictions, not observed station measurements.',
  coverageNote:'Conditions are for one coordinate, not the average or full coverage of a state/country. Update frequency and confidence vary by provider and location.',
  providerLinks:['https://openweathermap.org/current','https://openweathermap.org/forecast5'],
 };
}
