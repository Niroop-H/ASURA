const BASE = 'https://aeroapi.flightaware.com/aeroapi';
const ISO_ID = /^[A-Z0-9]{3,5}$/;
const FLIGHT_ID = /^[A-Za-z0-9_-]{3,100}$/;
const BOARD_TYPES = new Set(['departures','arrivals','scheduled_departures','scheduled_arrivals']);

export function hasLicensedFlightAware() {
  return process.env.FLIGHTAWARE_PUBLIC_DISPLAY_LICENSED === 'true' &&
    process.env.FLIGHTAWARE_OPERATIONAL_USE_AUTHORIZED === 'true' &&
    !!process.env.FLIGHTAWARE_AEROAPI_KEY;
}
export function flightAwareUnavailable() {
  return {
    success: false, status: 503, provider: 'FlightAware AeroAPI',
    error: process.env.FLIGHTAWARE_PUBLIC_DISPLAY_LICENSED !== 'true'
      ? 'Licensed public-display use of FlightAware data has not been confirmed. Airport movement boards require explicit provider permission.'
      : process.env.FLIGHTAWARE_OPERATIONAL_USE_AUTHORIZED !== 'true'
      ? 'FlightAware intended-use authorization is not confirmed. Obtain written approval for ASURA\'s exact display, defence/research and any multi-provider use before enabling.'
      : 'FLIGHTAWARE_AEROAPI_KEY is not configured on the server.',
  };
}
export function normalizeFlight(f = {}) {
  const point = f.last_position || null;
  return {
    id: f.fa_flight_id || f.ident || null,
    faFlightId: f.fa_flight_id || null,
    callsign: f.ident || f.ident_icao || f.ident_iata || null,
    aircraftType: f.aircraft_type || null,
    registration: f.registration || null,
    airline: f.operator || null,
    origin: f.origin?.code_icao || f.origin?.code_iata || f.origin?.code || null,
    originName: f.origin?.name || null,
    destination: f.destination?.code_icao || f.destination?.code_iata || f.destination?.code || null,
    destinationName: f.destination?.name || null,
    scheduledDeparture: f.scheduled_off || f.scheduled_out || null,
    estimatedDeparture: f.estimated_off || f.estimated_out || null,
    actualDeparture: f.actual_off || f.actual_out || null,
    scheduledArrival: f.scheduled_on || f.scheduled_in || null,
    estimatedArrival: f.estimated_on || f.estimated_in || null,
    actualArrival: f.actual_on || f.actual_in || null,
    cancelled: f.cancelled === true,
    diverted: f.diverted === true,
    status: f.status || null,
    position: point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
      ? {lat: point.latitude, lon: point.longitude, observedAt: point.timestamp || null,
          altitudeFeet: Number.isFinite(point.altitude) ? point.altitude * 100 : null,
          speedKnots: Number.isFinite(point.groundspeed) ? point.groundspeed : null,
          heading: Number.isFinite(point.heading) ? point.heading : null,
        } : null,
    provider: 'FlightAware AeroAPI',
  };
}
export async function flightAwareFetch(path, seconds = 120) {
  if (!hasLicensedFlightAware()) return flightAwareUnavailable();
  const url = BASE + path;
  const response = await fetch(url, {
    headers: { 'x-apikey': process.env.FLIGHTAWARE_AEROAPI_KEY, Accept: 'application/json' },
    next: { revalidate: seconds }, signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    return {success: false, status: response.status >= 500 ? 502 : response.status,
      provider: 'FlightAware AeroAPI',
      error: 'FlightAware returned HTTP ' + response.status + '. Confirm API subscription, quota, airport code and access tier.'};
  }
  return { success: true, data: await response.json() };
}
export async function getAirportBoard(code, board, destination) {
  const id = String(code || '').trim().toUpperCase();
  const dest = String(destination || '').trim().toUpperCase();
  if (!ISO_ID.test(id) || (!BOARD_TYPES.has(board) && board !== 'route') ||
      (board === 'route' && !ISO_ID.test(dest))) {
    return {success:false,status:400,error:'Invalid airport code or board selection'};
  }
  const path = board === 'route'
    ? '/airports/' + id + '/flights/to/' + dest
    : '/airports/' + id + '/flights/' + board;
  const query = new URLSearchParams({max_pages:'1'});
  const result = await flightAwareFetch(path + '?' + query, 120);
  if (!result.success) return result;
  const items = board === 'route'
    ? (result.data.flights || [])
    : (result.data[board] || []);
  if (!Array.isArray(items)) {
    return {success:false,status:502,error:'Unexpected FlightAware airport board response'};
  }
  return {success:true,provider:'FlightAware AeroAPI',airport:id,board,destination:dest||null,
    retrievedAt:new Date().toISOString(),count:items.length,
    complete: !result.data.links?.next,
    flights:items.slice(0,100).map(normalizeFlight),
    note:'One provider page only; provider-reported airport movements, not a complete airport movement history.'};
}
export async function getFlightOperations(ident) {
  const id = String(ident||'').trim();
  if (!FLIGHT_ID.test(id)) return {success:false,status:400,error:'Invalid flight identifier'};
  const response = await flightAwareFetch('/flights/' + encodeURIComponent(id), 120);
  if (!response.success) return response;
  if (!Array.isArray(response.data.flights)) return {success:false,status:502,error:'Unexpected flight status response'};
  const flights = response.data.flights.slice(0,15).map(normalizeFlight);
  return {success:true,provider:'FlightAware AeroAPI',retrievedAt:new Date().toISOString(),flights,
    note:'If a callsign is reused, select the matching flight by its scheduled date and unique fa_flight_id.'};
}
export async function getFlightTrack(faFlightId) {
  const id = String(faFlightId||'').trim();
  if (!FLIGHT_ID.test(id) || !id.includes('-')) {
    return {success:false,status:400,error:'A unique FlightAware fa_flight_id is required for historical track retrieval'};
  }
  const result = await flightAwareFetch('/flights/' + encodeURIComponent(id) + '/track?include_estimated_positions=false', 120);
  if (!result.success) return result;
  if (!Array.isArray(result.data.positions)) return {success:false,status:502,error:'Unexpected flight track response'};
  return {
    success:true,provider:'FlightAware AeroAPI',flightId:id,retrievedAt:new Date().toISOString(),
    points:result.data.positions.map(p => ({
      lat:p.latitude,lon:p.longitude,observedAt:p.timestamp,
      altitudeFeet:Number.isFinite(p.altitude) ? p.altitude * 100 : null,
      speedKnots:Number.isFinite(p.groundspeed) ? p.groundspeed : null,
      estimated:false,
    })).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)).slice(-1500),
    note:'Historical provider-reported track. Estimated positions excluded; gaps may still occur.',
  };
}
