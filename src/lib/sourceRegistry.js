/**
 * ASURA Source Registry — in-memory store.
 *
 * On Vercel serverless, this resets on cold starts.
 * Future: back with a database via repository interfaces.
 */

const DEFAULT_SOURCES = [
  {
    id: 'src_usgs_earthquake',
    name: 'USGS Earthquake Feed',
    domain: 'geo',
    type: 'api',
    endpoint: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
    description: 'Real-time earthquake data from USGS — no API key required.',
    authRequired: false,
    enabled: true,
    freeTier: 'Unlimited (public)',
    rateLimit: null,
    lastCheck: null,
    lastError: null,
    status: 'unverified',
  },
  {
    id: 'src_opensky',
    name: 'OpenSky Network',
    domain: 'aviation',
    type: 'api',
    endpoint: 'https://opensky-network.org/api/states/all',
    description: 'Live aircraft state vectors — anonymous access available.',
    authRequired: false,
    enabled: true,
    freeTier: '400 req/day (anonymous), more with auth',
    rateLimit: '10 req/10s',
    lastCheck: null,
    lastError: null,
    status: 'unverified',
  },
  {
    id: 'src_newsapi',
    name: 'NewsAPI.org',
    domain: 'news',
    type: 'api',
    endpoint: 'https://newsapi.org/v2',
    description: 'Global news headlines and article search.',
    authRequired: true,
    authEnvVar: 'NEWSAPI_KEY',
    enabled: true,
    freeTier: '100 req/day',
    rateLimit: '100/day',
    lastCheck: null,
    lastError: null,
    status: 'unverified',
  },
  {
    id: 'src_openweather',
    name: 'OpenWeatherMap',
    domain: 'weather',
    type: 'api',
    endpoint: 'https://api.openweathermap.org/data/2.5',
    description: 'Current weather, forecasts, and air quality.',
    authRequired: true,
    authEnvVar: 'OPENWEATHERMAP_API_KEY',
    enabled: true,
    freeTier: '1,000 calls/day',
    rateLimit: '60/min',
    lastCheck: null,
    lastError: null,
    status: 'unverified',
  },
  {
    id: 'src_nasa_eonet',
    name: 'NASA EONET',
    domain: 'geo',
    type: 'api',
    endpoint: 'https://eonet.gsfc.nasa.gov/api/v3/events',
    description: 'Earth natural events — wildfires, storms, volcanic eruptions.',
    authRequired: false,
    enabled: true,
    freeTier: 'Unlimited (public)',
    rateLimit: null,
    lastCheck: null,
    lastError: null,
    status: 'unverified',
  },
  {
    id: 'src_aviationstack',
    name: 'AviationStack',
    domain: 'aviation',
    type: 'api',
    endpoint: 'http://api.aviationstack.com/v1',
    description: 'Flight tracking, airline routes, airport data.',
    authRequired: true,
    authEnvVar: 'AVIATIONSTACK_API_KEY',
    enabled: true,
    freeTier: '100 req/month',
    rateLimit: '100/month',
    lastCheck: null,
    lastError: null,
    status: 'unverified',
  },
  {
    id: 'src_google_search',
    name: 'Google Programmable Search',
    domain: 'search',
    type: 'api',
    endpoint: 'https://www.googleapis.com/customsearch/v1',
    description: 'Web search via Google Custom Search API.',
    authRequired: true,
    authEnvVar: 'GOOGLE_SEARCH_API_KEY',
    enabled: true,
    freeTier: '100 queries/day',
    rateLimit: '100/day',
    lastCheck: null,
    lastError: null,
    status: 'unverified',
  },
  {
    id: 'src_rss_generic',
    name: 'RSS / Atom Feeds',
    domain: 'news',
    type: 'rss',
    endpoint: null,
    description: 'Generic RSS/Atom feed ingestion for news and public updates.',
    authRequired: false,
    enabled: true,
    freeTier: 'N/A',
    rateLimit: 'Configurable',
    lastCheck: null,
    lastError: null,
    status: 'unverified',
  },
];

// In-memory store
let sources = [...DEFAULT_SOURCES];
let nextId = sources.length + 1;

export function getAllSources() {
  return [...sources];
}

export function getSourceById(id) {
  return sources.find((s) => s.id === id) || null;
}

export function getSourcesByDomain(domain) {
  return sources.filter((s) => s.domain === domain);
}

export function addSource(data) {
  const newSource = {
    id: `src_custom_${nextId++}`,
    name: data.name,
    domain: data.domain || 'search',
    type: data.type || 'api',
    endpoint: data.endpoint || null,
    description: data.description || '',
    authRequired: data.authRequired || false,
    authEnvVar: data.authEnvVar || null,
    enabled: true,
    freeTier: data.freeTier || null,
    rateLimit: data.rateLimit || null,
    lastCheck: null,
    lastError: null,
    status: 'unverified',
  };
  sources.push(newSource);
  return newSource;
}

export function updateSource(id, updates) {
  const idx = sources.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  sources[idx] = { ...sources[idx], ...updates, id }; // prevent id overwrite
  return sources[idx];
}

export function deleteSource(id) {
  const idx = sources.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  sources.splice(idx, 1);
  return true;
}

export function toggleSource(id) {
  const src = sources.find((s) => s.id === id);
  if (!src) return null;
  src.enabled = !src.enabled;
  return src;
}

export function resetSources() {
  sources = [...DEFAULT_SOURCES];
  nextId = sources.length + 1;
}
