// Live-source adapters: no fixtures, seed records, or silent fallback.
const SOURCE_LABELS = {
  earthquakes: 'USGS Earthquake Catalog',
  events: 'NASA EONET',
  flights: 'adsb.lol',
  weather: 'OpenWeather',
  news: 'NewsAPI',
  flightaware: 'FlightAware AeroAPI',
};
export const LIVE_SOURCES = Object.keys(SOURCE_LABELS);
const when = value => value == null ? null : new Date(value).toISOString();
const normalizeUrl = value => {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; }
  catch { return null; }
};
async function retrieve(url, interval) {
  const response = await fetch(url, {
    next: { revalidate: interval },
    signal: AbortSignal.timeout(10000),
    headers: { Accept: 'application/json', 'User-Agent': 'ASURA/1.0 (public observation viewer; research@mahquantum.tech)' },
  });
  if (!response.ok) throw new Error('Upstream returned HTTP ' + response.status);
  return response.json();
}
function ok(source, data, items, interval) {
  return { success: true, source, provider: SOURCE_LABELS[source],
    retrievedAt: new Date().toISOString(), refreshSeconds: interval,
    count: items.length, records: items, providerTime: data?.time ? when(data.time * 1000) : null };
}
export async function getLiveSource(source, options = {}) {
  if (!LIVE_SOURCES.includes(source)) {
    return { success: false, source, error: 'Unknown source', status: 400 };
  }
  const interval = { earthquakes: 90, events: 300, flights: 120, weather: 300, news: 600 }[source];
  try {
    if (source === 'earthquakes') {
      const data = await retrieve('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson', interval);
      if (!Array.isArray(data.features)) throw new Error('Invalid USGS payload');
      const items = data.features.slice(0, 100).map(f => ({
        id: String(f.id), title: f.properties?.title || 'Earthquake',
        lat: f.geometry?.coordinates?.[1], lon: f.geometry?.coordinates?.[0],
        observedAt: when(f.properties?.time), source: 'USGS',
        url: normalizeUrl(f.properties?.url),
        description: 'Magnitude ' + (f.properties?.mag ?? 'unreported') +
          ' · depth ' + (f.geometry?.coordinates?.[2] ?? 'unknown') + ' km',
      })).filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lon) && x.observedAt);
      return ok(source, data, items, interval);
    }
    if (source === 'events') {
      const data = await retrieve('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=60', interval);
      if (!Array.isArray(data.events)) throw new Error('Invalid NASA payload');
      const items = data.events.map(e => {
        const location = [...(e.geometry || [])].reverse().find(g => g.type === 'Point' && Array.isArray(g.coordinates));
        return {
          id: String(e.id), title: e.title || 'Natural event',
          lat: location?.coordinates?.[1], lon: location?.coordinates?.[0],
          observedAt: location?.date ? when(location.date) : null,
          source: 'NASA EONET', url: normalizeUrl(e.link),
          description: (e.categories || []).map(c => c.title).filter(Boolean).join(', ') || 'Natural event',
        };
      }).filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lon));
      return ok(source, data, items, interval);
    }
    if (source === 'flightaware') {
      // No scraping of flightaware.com. A separate, authorized paid provider; never mix with ADS-B.
      if (process.env.FLIGHTAWARE_PUBLIC_DISPLAY_LICENSED !== 'true') {
        return { success: false, source, provider: 'FlightAware AeroAPI', status: 503,
          error: 'FlightAware public-display/redistribution license has not been confirmed. Set FLIGHTAWARE_PUBLIC_DISPLAY_LICENSED=true only if your agreement permits this use.' };
      }
      if (!process.env.FLIGHTAWARE_AEROAPI_KEY) {
        return { success: false, source, provider: 'FlightAware AeroAPI', status: 503,
          error: 'FLIGHTAWARE_AEROAPI_KEY is not configured.' };
      }
      const areas = {
        bengaluru: [12.9716, 77.5946], london: [51.4700, -0.4543],
        singapore: [1.3644, 103.9915], newyork: [40.6413, -73.7781], dubai: [25.2532, 55.3657]
      };
      const [fallbackLat, fallbackLon] = areas[options.region] || areas.bengaluru;
      const lat = Number.isFinite(options.lat) ? options.lat : fallbackLat;
      const lon = Number.isFinite(options.lon) ? options.lon : fallbackLon;
      const query = '-latlong "' + [Math.max(-90, lat - 2.2), Math.max(-180, lon - 2.2), Math.min(90, lat + 2.2), Math.min(180, lon + 2.2)].map(x => x.toFixed(4)).join(' ') + '"';
      const u = new URL('https://aeroapi.flightaware.com/aeroapi/flights/search');
      u.searchParams.set('query', query);
      u.searchParams.set('max_pages', '1'); // Keep usage bounded (AeroAPI is metered).
      const response = await fetch(u, { next: { revalidate: 120 }, signal: AbortSignal.timeout(10000),
        headers: { 'x-apikey': process.env.FLIGHTAWARE_AEROAPI_KEY, 'Accept': 'application/json' } });
      if (!response.ok) throw new Error('FlightAware AeroAPI HTTP ' + response.status);
      const data = await response.json();
      if (!Array.isArray(data.flights)) throw new Error('Unexpected FlightAware response');
      const records = data.flights.map(f => {
        const p = f.last_position;
        if (!p || !Number.isFinite(p.latitude) || !Number.isFinite(p.longitude)) return null;
        const age = p.timestamp ? Math.max(0, Math.round((Date.now() - Date.parse(p.timestamp)) / 1000)) : null;
        return {
          id: String(f.fa_flight_id || f.ident), faFlightId: f.fa_flight_id || null,
          title: f.ident || f.ident_icao || f.ident_iata || 'Flight',
          registration: null, aircraftType: f.aircraft_type || null,
          lat: p.latitude, lon: p.longitude, source: 'FlightAware AeroAPI',
          observedAt: p.timestamp || null, ageSeconds: age,
          altitudeFeet: Number.isFinite(p.altitude) ? p.altitude * 100 : null,
          speedKnots: Number.isFinite(p.groundspeed) ? p.groundspeed : null,
          heading: Number.isFinite(p.heading) ? p.heading : null,
          origin: f.origin?.code_icao || f.origin?.code || null,
          destination: f.destination?.code_icao || f.destination?.code || null,
          actualOff: f.actual_off || null, actualOn: f.actual_on || null,
          positionType: p.update_type || null,
          description: 'FlightAware flight status', url: f.fa_flight_id
            ? 'https://www.flightaware.com/live/flight/id/' + encodeURIComponent(f.fa_flight_id) : null,
        };
      }).filter(Boolean);
      return { success: true, source, provider: 'FlightAware AeroAPI', count: records.length, records,
        retrievedAt: new Date().toISOString(), refreshSeconds: 120,
        coverage: 'AeroAPI search results (first page); partial regional coverage possible',
        attribution: 'FlightAware licensed data; service and usage restrictions apply' };
    }
    if (source === 'flights') {
      const regions = {
        bengaluru: { lat: 12.9716, lon: 77.5946, name: 'Bengaluru' },
        london: { lat: 51.4700, lon: -0.4543, name: 'London' },
        singapore: { lat: 1.3644, lon: 103.9915, name: 'Singapore' },
        newyork: { lat: 40.6413, lon: -73.7781, name: 'New York' },
        dubai: { lat: 25.2532, lon: 55.3657, name: 'Dubai' },
      };
      const center = { ...(regions[options.region] || regions.bengaluru) };
      if (Number.isFinite(options.lat) && Number.isFinite(options.lon)) {
        center.lat = Math.round(options.lat * 10) / 10;
        center.lon = Math.round(options.lon * 10) / 10;
        center.name = 'Custom map center';
      }
      const radius = 250; // Public adsb.lol and adsb.fi geographic API maximum (nautical miles).
      const providers = [
        { name: 'adsb.lol', url: 'https://api.adsb.lol/v2/lat/' + center.lat + '/lon/' + center.lon + '/dist/' + radius },
        // adsb.fi explicitly restricts public service to non-commercial use.
        ...(process.env.ADSB_FI_NONCOMMERCIAL_AUTHORIZED === 'true'
          ? [{ name: 'adsb.fi', url: 'https://opendata.adsb.fi/api/v3/lat/' + center.lat + '/lon/' + center.lon + '/dist/' + radius }] : []),
      ];
      const failures = [];
      for (const p of providers) {
        try {
          const data = await retrieve(p.url, 25);
          if (!Array.isArray(data.ac)) throw new Error('Unexpected aircraft payload');
          const now = Number(data.now) > 1e12 ? Number(data.now) / 1000 : Number(data.now) || Date.now() / 1000;
          const eligible = data.ac.filter(a => Number.isFinite(a.lat) && Number.isFinite(a.lon) && Number(a.seen_pos ?? 0) <= 120);
          const records = eligible.slice(0, 1500).map(a => ({
            id: String(a.hex || a.flight || ''), title: String(a.flight || a.r || a.hex || 'Aircraft').trim(),
            lat: a.lat, lon: a.lon, source: p.name, observedAt: when((now - Number(a.seen_pos || 0)) * 1000),
            description: [a.t || 'Aircraft', a.r || null].filter(Boolean).join(' · '),
            registration: a.r || null, aircraftType: a.t || null, icao24: a.hex || null,
            altitudeFeet: Number.isFinite(a.alt_baro) ? a.alt_baro : null,
            geometricAltitudeFeet: Number.isFinite(a.alt_geom) ? a.alt_geom : null,
            verticalRateFpm: Number.isFinite(a.baro_rate) ? a.baro_rate : null,
            squawk: a.squawk || null, category: a.category || null,
            speedKnots: Number.isFinite(a.gs) ? a.gs : null,
            heading: Number.isFinite(a.track) ? a.track : null,
            ageSeconds: Math.round(Number(a.seen_pos || 0)), onGround: a.alt_baro === 'ground', url: null,
          }));
          return { success: true, source, provider: p.name, retrievedAt: new Date().toISOString(),
            refreshSeconds: 30, count: records.length, records, region: center.name,
            center: { lat: center.lat, lon: center.lon }, radiusNm: radius,
            positionedAircraft: eligible.length, providerReportedAircraft: Number(data.total) || data.ac.length,
            truncated: eligible.length > records.length,
            coverage: '250 NM from selected map center; not a complete worldwide aircraft inventory',
            attribution: p.name === 'adsb.lol' ? 'Aircraft observations © adsb.lol contributors; ODbL 1.0' : 'Aircraft observations © adsb.fi contributors; non-commercial license' };
        } catch (error) { failures.push(p.name + ': ' + error.message); }
      }
      throw new Error(failures.join('; '));
    }
    if (source === 'weather') {
      // Support location-scoped weather queries. Without coordinates, retain
      // Bengaluru as the explicitly labelled dashboard default.
      const weatherLat = Number.isFinite(options.lat) && Math.abs(options.lat) <= 90 ? options.lat : 12.9716;
      const weatherLon = Number.isFinite(options.lon) && Math.abs(options.lon) <= 180 ? options.lon : 77.5946;
      const weatherName = typeof options.label === 'string' && options.label.trim()
        ? options.label.trim().slice(0,90) : 'Bengaluru';
      const key = process.env.OPENWEATHERMAP_API_KEY;
      if (key) {
        try {
          const url = 'https://api.openweathermap.org/data/2.5/weather?lat=' + weatherLat.toFixed(4) +
            '&lon=' + weatherLon.toFixed(4) + '&units=metric&appid=' + encodeURIComponent(key);
          const data = await retrieve(url, 300);
          if (!Number.isFinite(data.main?.temp)) throw new Error('Invalid OpenWeather payload');
          return { success: true, source, provider: 'OpenWeather', count: 1, refreshSeconds: 300,
            retrievedAt: new Date().toISOString(), records: [{
              id: weatherName.toLowerCase(), title: weatherName + ' current weather',
              lat: data.coord?.lat ?? weatherLat, lon: data.coord?.lon ?? weatherLon,
              observedAt: when(data.dt * 1000), source: 'OpenWeather',
              temperatureC: data.main.temp, humidity: data.main.humidity,
              windKmh: Number.isFinite(data.wind?.speed) ? data.wind.speed * 3.6 : null,
              description: data.weather?.[0]?.description || 'Weather',
              url: 'https://openweathermap.org/',
            }] };
        } catch { /* Fall through to the independent public forecast source. */ }
      }
      const data = await retrieve('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=' +
        weatherLat.toFixed(4) + '&lon=' + weatherLon.toFixed(4), 300);
      const sample = data.properties?.timeseries?.[0];
      const details = sample?.data?.instant?.details;
      if (!Number.isFinite(details?.air_temperature)) throw new Error('MET Norway data unavailable');
      return { success: true, source, provider: 'MET Norway Locationforecast', count: 1,
        refreshSeconds: 300, retrievedAt: new Date().toISOString(),
        coverage: 'Forecast model estimates, not direct sensor observations',
        attribution: 'Weather data from MET Norway — met.no',
        records: [{ id: weatherName.toLowerCase(), title: weatherName + ' forecast conditions',
          lat: weatherLat, lon: weatherLon, observedAt: when(sample.time),
          source: 'MET Norway', temperatureC: details.air_temperature,
          humidity: details.relative_humidity, windKmh: details.wind_speed * 3.6,
          description: 'Current forecast estimate (model output)',
          url: 'https://www.met.no/' }] };
    }
    if (source === 'news') {
      if (!process.env.NEWSAPI_KEY) {
        return { success: false, source, error: 'NEWSAPI_KEY is not configured', status: 503 };
      }
      const url = 'https://newsapi.org/v2/top-headlines?language=en&pageSize=25&apiKey=' +
        encodeURIComponent(process.env.NEWSAPI_KEY);
      const data = await retrieve(url, interval);
      if (!Array.isArray(data.articles)) throw new Error('Invalid NewsAPI payload');
      const items = data.articles.map((a, i) => ({
        id: String(i) + ':' + (a.url || a.title), title: a.title || 'Untitled report',
        lat: null, lon: null, observedAt: a.publishedAt ? when(a.publishedAt) : null,
        source: a.source?.name || 'NewsAPI', url: normalizeUrl(a.url),
        description: String(a.description || '').slice(0, 320),
      }));
      return ok(source, data, items, interval);
    }
  } catch (error) {
    return { success: false, source, provider: SOURCE_LABELS[source],
      retrievedAt: new Date().toISOString(), status: 502,
      error: error.name === 'TimeoutError' ? 'Provider timed out' : error.message };
  }
}

/**
 * Locate a publicly broadcasting aircraft by ADS-B callsign, registration or
 * six-digit ICAO address anywhere covered by the network.
 * This is not a complete worldwide database or itinerary search.
 */
export async function findLiveAircraft(mode, rawQuery) {
  const paths = { callsign: 'callsign', registration: 'registration', icao: 'icao' };
  const query = typeof rawQuery === 'string' ? rawQuery.trim().toUpperCase() : '';
  if (!paths[mode] || !/^[A-Z0-9-]{3,12}$/.test(query) ||
      (mode === 'icao' && !/^[A-F0-9]{6}$/.test(query))) {
    return { success: false, status: 400, error: 'Search must contain a valid callsign, registration or six-digit ICAO hex address.' };
  }
  try {
    const data = await retrieve('https://api.adsb.lol/v2/' + paths[mode] + '/' + encodeURIComponent(query), 60);
    if (!Array.isArray(data.ac)) throw new Error('Unexpected aircraft lookup response');
    const now = Number(data.now) > 1e12 ? Number(data.now) / 1000 : Number(data.now) || Date.now() / 1000;
    const records = data.ac.filter(a => Number.isFinite(a.lat) && Number.isFinite(a.lon) &&
      Number(a.seen_pos ?? 0) <= 120).slice(0, 25).map(a => ({
      id: String(a.hex || a.flight || ''), title: String(a.flight || a.r || a.hex || 'Aircraft').trim(),
      lat: a.lat, lon: a.lon, source: 'adsb.lol',
      registration: a.r || null, aircraftType: a.t || null, icao24: a.hex || null,
      altitudeFeet: Number.isFinite(a.alt_baro) ? a.alt_baro : null,
      speedKnots: Number.isFinite(a.gs) ? a.gs : null,
      heading: Number.isFinite(a.track) ? a.track : null,
      ageSeconds: Math.round(Number(a.seen_pos || 0)),
      observedAt: when((now - Number(a.seen_pos || 0)) * 1000),
    }));
    return { success: true, provider: 'adsb.lol', retrievedAt: new Date().toISOString(),
      mode, query, records, count: records.length,
      coverage: 'Broadcasting aircraft with recent positions in network coverage only; no itinerary guaranteed.' };
  } catch (error) {
    return { success: false, status: 502, error: error.message || 'Aircraft lookup unavailable' };
  }
}
