/**
 * ASURA KeyHolder — Next.js edition (server-only).
 *
 * Reads keys from process.env (populated by Vercel env vars or .env.local).
 * Exposes status for the /api/keys health endpoint — never exposes values.
 */

const KEY_REGISTRY = [
  // AI
  { envVar: 'GROQ_API_KEY',            provider: 'Groq',                      domain: 'ai',       priority: 'required',    pattern: /^gsk_[A-Za-z0-9]{20,}$/,  freeTier: '14,400 req/day',       docsUrl: 'https://console.groq.com/keys' },
  { envVar: 'OPENAI_API_KEY',          provider: 'OpenAI',                    domain: 'ai',       priority: 'optional',    pattern: /^sk-[A-Za-z0-9_-]{20,}$/ },
  { envVar: 'ANTHROPIC_API_KEY',       provider: 'Anthropic',                 domain: 'ai',       priority: 'optional',    pattern: /^sk-ant-[A-Za-z0-9_-]{20,}$/ },
  { envVar: 'GOOGLE_AI_API_KEY',       provider: 'Google AI (Gemini)',        domain: 'ai',       priority: 'optional',    pattern: /^AIza[A-Za-z0-9_-]{30,}$/ },
  // Search
  { envVar: 'GOOGLE_SEARCH_API_KEY',   provider: 'Google Programmable Search',domain: 'search',   priority: 'recommended', pattern: /^AIza[A-Za-z0-9_-]{30,}$/, freeTier: '100 queries/day',     docsUrl: 'https://developers.google.com/custom-search/v1/introduction' },
  { envVar: 'GOOGLE_SEARCH_ENGINE_ID', provider: 'Google PSE (CX ID)',        domain: 'search',   priority: 'recommended' },
  { envVar: 'SERPAPI_API_KEY',          provider: 'SerpAPI',                   domain: 'search',   priority: 'optional',    freeTier: '100 searches/month' },
  // News
  { envVar: 'NEWSAPI_KEY',             provider: 'NewsAPI.org',               domain: 'news',     priority: 'recommended', pattern: /^[a-f0-9]{32}$/,           freeTier: '100 req/day',         docsUrl: 'https://newsapi.org/register' },
  { envVar: 'GNEWS_API_KEY',           provider: 'GNews',                     domain: 'news',     priority: 'optional',    freeTier: '100 req/day' },
  // Geo
  { envVar: 'CESIUM_ION_ACCESS_TOKEN', provider: 'Cesium Ion',                domain: 'geo',      priority: 'recommended', pattern: /^eyJ[A-Za-z0-9_-]{50,}$/,  freeTier: '50,000 tiles/month',  docsUrl: 'https://ion.cesium.com/tokens' },
  { envVar: 'MAPBOX_ACCESS_TOKEN',     provider: 'Mapbox',                    domain: 'geo',      priority: 'optional',    pattern: /^pk\.eyJ[A-Za-z0-9_-]{50,}$/, freeTier: '50,000 loads/month' },
  // Aviation
  { envVar: 'AVIATIONSTACK_API_KEY',   provider: 'AviationStack',             domain: 'aviation', priority: 'recommended', freeTier: '100 req/month' },
  { envVar: 'OPENSKY_USERNAME',        provider: 'OpenSky Network',           domain: 'aviation', priority: 'optional' },
  { envVar: 'OPENSKY_PASSWORD',        provider: 'OpenSky Network (pass)',    domain: 'aviation', priority: 'optional' },
  { envVar: 'ADSBX_RAPIDAPI_KEY',      provider: 'ADS-B Exchange',            domain: 'aviation', priority: 'optional' },
  // Maritime
  { envVar: 'MARINETRAFFIC_API_KEY',   provider: 'MarineTraffic',             domain: 'maritime', priority: 'optional' },
  // Weather
  { envVar: 'OPENWEATHERMAP_API_KEY',  provider: 'OpenWeatherMap',            domain: 'weather',  priority: 'recommended', pattern: /^[a-f0-9]{32}$/,           freeTier: '1,000 calls/day' },
  // Database
  { envVar: 'DATABASE_URL',            provider: 'Primary DB',                domain: 'database', priority: 'optional' },
  { envVar: 'MONGODB_URI',             provider: 'MongoDB Atlas',             domain: 'database', priority: 'optional',    freeTier: '512 MB storage' },
  { envVar: 'REDIS_URL',               provider: 'Upstash Redis',             domain: 'database', priority: 'optional',    freeTier: '10,000 cmd/day' },
  // App
  { envVar: 'JWT_SECRET',              provider: 'JWT Signing Secret',        domain: 'app',      priority: 'required',    pattern: /^.{16,}$/ },
];

function evaluateKeys() {
  return KEY_REGISTRY.map((def) => {
    const raw = process.env[def.envVar]?.trim() ?? '';
    const present = raw.length > 0;
    let valid = true;
    let error;
    if (present && def.pattern && !def.pattern.test(raw)) {
      valid = false;
      error = `Value does not match expected format`;
    }
    return {
      envVar:   def.envVar,
      provider: def.provider,
      domain:   def.domain,
      priority: def.priority,
      present,
      valid:    present ? valid : true,
      freeTier: def.freeTier || null,
      docsUrl:  def.docsUrl || null,
      ...(error && { error }),
    };
  });
}

function getKey(envVar) {
  const raw = process.env[envVar]?.trim();
  return raw || undefined;
}

function requireKey(envVar) {
  const val = getKey(envVar);
  if (!val) {
    const def = KEY_REGISTRY.find((d) => d.envVar === envVar);
    throw new Error(`Missing required key: ${envVar}${def?.docsUrl ? ' — ' + def.docsUrl : ''}`);
  }
  return val;
}

function hasKey(envVar) {
  return !!(process.env[envVar]?.trim());
}

function getProblems() {
  const statuses = evaluateKeys();
  const issues = [];
  for (const s of statuses) {
    if (!s.present && s.priority === 'required')
      issues.push({ severity: 'error', message: `Missing required key: ${s.envVar} (${s.provider})`, envVar: s.envVar });
    if (s.present && !s.valid)
      issues.push({ severity: 'error', message: `Invalid format: ${s.envVar}`, envVar: s.envVar });
    if (!s.present && s.priority === 'recommended')
      issues.push({ severity: 'warning', message: `Missing recommended key: ${s.envVar} (${s.provider})`, envVar: s.envVar });
  }
  return issues;
}

export { KEY_REGISTRY, evaluateKeys, getKey, requireKey, hasKey, getProblems };
