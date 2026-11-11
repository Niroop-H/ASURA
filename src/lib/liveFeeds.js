// Live-source adapters: no fixtures, seed records, or silent fallback.
const SOURCE_LABELS = {
  earthquakes: 'USGS Earthquake Catalog',
  events: 'NASA EONET',
  flights: 'adsb.lol',
  weather: 'OpenWeather',
  news: 'NewsAPI',
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
    if (source === 'flights') {
      const regions = {
        bengaluru: { lat: 12.9716, lon: 77.5946, name: 'Bengaluru' },
        london: { lat: 51.4700, lon: -0.4543, name: 'London' },
        singapore: { lat: 1.3644, lon: 103.9915, name: 'Singapore' },
        newyork: { lat: 40.6413, lon: -73.7781, name: 'New York' },
        dubai: { lat: 25.2532, lon: 55.3657, name: 'Dubai' },
      };
      const center = regions[options.region] || regions.bengaluru;
      const providers = [
        { name: 'adsb.lol', url: 'https://api.adsb.lol/v2/lat/' + center.lat + '/lon/' + center.lon + '/dist/180' },
        { name: 'adsb.fi', url: 'https://opendata.adsb.fi/api/v3/lat/' + center.lat + '/lon/' + center.lon + '/dist/180' },
      ];
      const failures = [];
      for (const p of providers) {
        try {
          const data = await retrieve(p.url, 60);
          if (!Array.isArray(data.ac)) throw new Error('Unexpected aircraft payload');
          const now = Number(data.now) > 1e12 ? Number(data.now) / 1000 : Number(data.now) || Date.now() / 1000;
          const records = data.ac.filter(a => Number.isFinite(a.lat) && Number.isFinite(a.lon) && Number(a.seen_pos ?? 0) <= 120).slice(0, 200).map(a => ({
            id: String(a.hex || a.flight || ''), title: String(a.flight || a.r || a.hex || 'Aircraft').trim(),
            lat: a.lat, lon: a.lon, source: p.name, observedAt: when((now - Number(a.seen_pos || 0)) * 1000),
            description: [a.t || 'Aircraft', a.r || null].filter(Boolean).join(' · '),
            altitudeFeet: Number.isFinite(a.alt_baro) ? a.alt_baro : null,
            speedKnots: Number.isFinite(a.gs) ? a.gs : null,
            heading: Number.isFinite(a.track) ? a.track : null,
            ageSeconds: Math.round(Number(a.seen_pos || 0)), url: null,
          }));
          return { success: true, source, provider: p.name, retrievedAt: new Date().toISOString(),
            refreshSeconds: 60, count: records.length, records, region: center.name,
            coverage: 'Public receiver coverage, not guaranteed complete',
            attribution: 'Volunteer receiver data; provider terms apply' };
        } catch (error) { failures.push(p.name + ': ' + error.message); }
      }
      throw new Error(failures.join('; '));
    }
    if (source === 'weather') {
      const key = process.env.OPENWEATHERMAP_API_KEY;
      if (key) {
        try {
          const url = 'https://api.openweathermap.org/data/2.5/weather?lat=12.9716&lon=77.5946&units=metric&appid=' + encodeURIComponent(key);
          const data = await retrieve(url, 300);
          if (!Number.isFinite(data.main?.temp)) throw new Error('Invalid OpenWeather payload');
          return { success: true, source, provider: 'OpenWeather', count: 1, refreshSeconds: 300,
            retrievedAt: new Date().toISOString(), records: [{
              id: 'bengaluru', title: 'Bengaluru current weather',
              lat: data.coord?.lat ?? 12.9716, lon: data.coord?.lon ?? 77.5946,
              observedAt: when(data.dt * 1000), source: 'OpenWeather',
              temperatureC: data.main.temp, humidity: data.main.humidity,
              windKmh: Number.isFinite(data.wind?.speed) ? data.wind.speed * 3.6 : null,
              description: data.weather?.[0]?.description || 'Weather',
              url: 'https://openweathermap.org/',
            }] };
        } catch { /* Fall through to the independent public forecast source. */ }
      }
      const data = await retrieve('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=12.9716&lon=77.5946', 300);
      const sample = data.properties?.timeseries?.[0];
      const details = sample?.data?.instant?.details;
      if (!Number.isFinite(details?.air_temperature)) throw new Error('MET Norway data unavailable');
      return { success: true, source, provider: 'MET Norway Locationforecast', count: 1,
        refreshSeconds: 300, retrievedAt: new Date().toISOString(),
        coverage: 'Forecast model estimates, not direct sensor observations',
        attribution: 'Weather data from MET Norway — met.no',
        records: [{ id: 'bengaluru', title: 'Bengaluru forecast conditions',
          lat: 12.9716, lon: 77.5946, observedAt: when(sample.time),
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
