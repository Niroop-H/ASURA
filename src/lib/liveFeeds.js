// Live-source adapters: no fixtures, seed records, or silent fallback.
const SOURCE_LABELS = {
  earthquakes: 'USGS Earthquake Catalog',
  events: 'NASA EONET',
  flights: 'OpenSky Network',
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
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Upstream returned HTTP ' + response.status);
  return response.json();
}
function ok(source, data, items, interval) {
  return { success: true, source, provider: SOURCE_LABELS[source],
    retrievedAt: new Date().toISOString(), refreshSeconds: interval,
    count: items.length, records: items, providerTime: data?.time ? when(data.time * 1000) : null };
}
export async function getLiveSource(source) {
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
      // Area limited to Bengaluru and adjacent airspace; avoid global polling and per-aircraft tracking.
      const data = await retrieve('https://opensky-network.org/api/states/all?lamin=11.5&lomin=76.5&lamax=14&lomax=79', interval);
      if (!Array.isArray(data.states)) throw new Error('Invalid OpenSky payload');
      const items = data.states.slice(0, 150).map(s => ({
        id: String(s[0]), title: String(s[1] || s[0]).trim() || 'Aircraft',
        lat: s[6], lon: s[5], observedAt: s[4] ? when(s[4] * 1000) : null,
        source: 'OpenSky', url: null,
        description: String(s[2] || 'Unknown origin') + ' · ' +
          (Number.isFinite(s[7]) ? Math.round(s[7]) + ' m altitude' : 'altitude unknown') +
          (s[8] ? ' · on ground' : ''),
      })).filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lon));
      return ok(source, data, items, interval);
    }
    if (source === 'weather') {
      if (!process.env.OPENWEATHERMAP_API_KEY) {
        return { success: false, source, error: 'OPENWEATHERMAP_API_KEY is not configured', status: 503 };
      }
      const url = 'https://api.openweathermap.org/data/2.5/weather?lat=12.9716&lon=77.5946&units=metric&appid=' +
        encodeURIComponent(process.env.OPENWEATHERMAP_API_KEY);
      const data = await retrieve(url, interval);
      if (!Number.isFinite(data.main?.temp)) throw new Error('Invalid OpenWeather payload');
      return ok(source, data, [{
        id: 'weather-bengaluru', title: 'Bengaluru current weather',
        lat: data.coord?.lat ?? 12.9716, lon: data.coord?.lon ?? 77.5946,
        observedAt: data.dt ? when(data.dt * 1000) : null, source: 'OpenWeather',
        url: 'https://openweathermap.org/', description: data.main.temp + '°C · ' +
          (data.weather?.[0]?.description || 'Conditions unknown') +
          ' · humidity ' + (data.main.humidity ?? 'unknown') + '%',
      }], interval);
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
