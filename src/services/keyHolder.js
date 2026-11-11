/**
 * ASURA Key Holder Service
 * ========================
 * Central, server-side-only manager for every API key / secret the system uses.
 *
 * Responsibilities:
 *   1. Load keys from environment variables (populated by .env or a vault).
 *   2. Validate presence & basic format at startup.
 *   3. Expose keys through typed accessors — never leak to frontend bundles.
 *   4. Report which providers are configured vs. missing (health check).
 *   5. Support hot-reload: call `reload()` after env changes.
 *
 * Design choices (per ASURA spec §7 & §10):
 *   - Keys stay in process memory; never logged, serialized, or sent to
 *     the frontend.
 *   - Each provider is behind a provider-independent interface so swapping
 *     a key or provider only touches this file and the adapter.
 *   - Free-tier quota metadata is stored alongside each key definition so
 *     the quota monitor can warn before exhaustion.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * @typedef {'required' | 'recommended' | 'optional'} KeyPriority
 */

/**
 * @typedef {Object} KeyDefinition
 * @property {string}      envVar       - Environment variable name.
 * @property {string}      provider     - Human-readable provider name.
 * @property {string}      domain       - Functional domain (ai, search, news, geo, aviation, maritime, weather, database, app).
 * @property {KeyPriority} priority     - How critical the key is at startup.
 * @property {RegExp}      [pattern]    - Optional regex the value must match.
 * @property {string}      [hint]       - Help text shown when the key is missing.
 * @property {string}      [freeTier]   - Brief free-tier limits note.
 * @property {string}      [docsUrl]    - Where to get the key.
 */

/**
 * @typedef {Object} KeyStatus
 * @property {string}      envVar
 * @property {string}      provider
 * @property {string}      domain
 * @property {KeyPriority} priority
 * @property {boolean}     present      - Key is set and non-empty.
 * @property {boolean}     valid        - Key passes the format check (true if no pattern).
 * @property {string}      [error]      - Why validation failed.
 */

// ---------------------------------------------------------------------------
// Key Registry  (single source of truth for every secret ASURA may need)
// ---------------------------------------------------------------------------

/** @type {KeyDefinition[]} */
const KEY_REGISTRY = [
  // ── AI Gateway ──────────────────────────────────────────────────────────
  {
    envVar:   'GROQ_API_KEY',
    provider: 'Groq',
    domain:   'ai',
    priority: 'required',
    pattern:  /^gsk_[A-Za-z0-9]{48,}$/,
    hint:     'Get your Groq API key at https://console.groq.com/keys',
    freeTier: '14,400 req/day (rate-limited per model)',
    docsUrl:  'https://console.groq.com/docs/quickstart',
  },
  // Future / fallback LLM providers
  {
    envVar:   'OPENAI_API_KEY',
    provider: 'OpenAI',
    domain:   'ai',
    priority: 'optional',
    pattern:  /^sk-[A-Za-z0-9_-]{20,}$/,
    hint:     'https://platform.openai.com/api-keys',
  },
  {
    envVar:   'ANTHROPIC_API_KEY',
    provider: 'Anthropic',
    domain:   'ai',
    priority: 'optional',
    pattern:  /^sk-ant-[A-Za-z0-9_-]{20,}$/,
    hint:     'https://console.anthropic.com/settings/keys',
  },
  {
    envVar:   'GOOGLE_AI_API_KEY',
    provider: 'Google AI (Gemini)',
    domain:   'ai',
    priority: 'optional',
    pattern:  /^AIza[A-Za-z0-9_-]{30,}$/,
    hint:     'https://aistudio.google.com/app/apikey',
  },

  // ── Search & Discovery ──────────────────────────────────────────────────
  {
    envVar:   'GOOGLE_SEARCH_API_KEY',
    provider: 'Google Programmable Search',
    domain:   'search',
    priority: 'recommended',
    pattern:  /^AIza[A-Za-z0-9_-]{30,}$/,
    hint:     'https://developers.google.com/custom-search/v1/introduction',
    freeTier: '100 queries/day',
  },
  {
    envVar:   'GOOGLE_SEARCH_ENGINE_ID',
    provider: 'Google Programmable Search (CX)',
    domain:   'search',
    priority: 'recommended',
    pattern:  /^[a-z0-9]{17}$/,
    hint:     'https://programmablesearchengine.google.com/controlpanel/all',
  },
  {
    envVar:   'SERPAPI_API_KEY',
    provider: 'SerpAPI',
    domain:   'search',
    priority: 'optional',
    hint:     'https://serpapi.com/manage-api-key',
    freeTier: '100 searches/month',
  },

  // ── News / OSINT ────────────────────────────────────────────────────────
  {
    envVar:   'NEWSAPI_KEY',
    provider: 'NewsAPI.org',
    domain:   'news',
    priority: 'recommended',
    pattern:  /^[a-f0-9]{32}$/,
    hint:     'https://newsapi.org/register',
    freeTier: '100 req/day, delayed headlines',
  },
  {
    envVar:   'GNEWS_API_KEY',
    provider: 'GNews',
    domain:   'news',
    priority: 'optional',
    hint:     'https://gnews.io/',
    freeTier: '100 req/day',
  },

  // ── Geospatial & Visualization ──────────────────────────────────────────
  {
    envVar:   'CESIUM_ION_ACCESS_TOKEN',
    provider: 'Cesium Ion',
    domain:   'geo',
    priority: 'recommended',
    pattern:  /^eyJ[A-Za-z0-9_-]{50,}$/,
    hint:     'https://ion.cesium.com/tokens',
    freeTier: '50,000 tile requests/month',
    docsUrl:  'https://cesium.com/learn/ion/cesium-ion-access-tokens/',
  },
  {
    envVar:   'MAPBOX_ACCESS_TOKEN',
    provider: 'Mapbox',
    domain:   'geo',
    priority: 'optional',
    pattern:  /^pk\.eyJ[A-Za-z0-9_-]{50,}$/,
    hint:     'https://account.mapbox.com/access-tokens/',
    freeTier: '50,000 map loads/month',
  },

  // ── Aviation ────────────────────────────────────────────────────────────
  {
    envVar:   'AVIATIONSTACK_API_KEY',
    provider: 'AviationStack',
    domain:   'aviation',
    priority: 'recommended',
    hint:     'https://aviationstack.com/signup/free',
    freeTier: '100 req/month (free plan)',
  },
  {
    envVar:   'OPENSKY_USERNAME',
    provider: 'OpenSky Network (user)',
    domain:   'aviation',
    priority: 'optional',
    hint:     'https://opensky-network.org/ — anonymous works, auth raises quota',
  },
  {
    envVar:   'OPENSKY_PASSWORD',
    provider: 'OpenSky Network (pass)',
    domain:   'aviation',
    priority: 'optional',
  },
  {
    envVar:   'ADSBX_RAPIDAPI_KEY',
    provider: 'ADS-B Exchange (RapidAPI)',
    domain:   'aviation',
    priority: 'optional',
    hint:     'https://rapidapi.com/adsbx/api/adsbx-flight-sim-traffic',
  },

  // ── Maritime ────────────────────────────────────────────────────────────
  {
    envVar:   'MARINETRAFFIC_API_KEY',
    provider: 'MarineTraffic',
    domain:   'maritime',
    priority: 'optional',
    hint:     'https://www.marinetraffic.com/en/ais-api-services',
  },

  // ── Weather & Environment ───────────────────────────────────────────────
  {
    envVar:   'OPENWEATHERMAP_API_KEY',
    provider: 'OpenWeatherMap',
    domain:   'weather',
    priority: 'recommended',
    pattern:  /^[a-f0-9]{32}$/,
    hint:     'https://home.openweathermap.org/api_keys',
    freeTier: '1,000 calls/day (One Call 3.0 = 1,000/day free)',
  },

  // ── Database / Cache ────────────────────────────────────────────────────
  {
    envVar:   'DATABASE_URL',
    provider: 'Primary Database',
    domain:   'database',
    priority: 'optional',
    hint:     'PostgreSQL, Supabase, PlanetScale, Neon, etc.',
  },
  {
    envVar:   'MONGODB_URI',
    provider: 'MongoDB Atlas',
    domain:   'database',
    priority: 'optional',
    hint:     'https://cloud.mongodb.com/ — 512 MB free cluster',
    freeTier: '512 MB storage, shared cluster',
  },
  {
    envVar:   'REDIS_URL',
    provider: 'Redis / Upstash',
    domain:   'database',
    priority: 'optional',
    hint:     'https://upstash.com/ — 10,000 commands/day free',
    freeTier: '10,000 commands/day (Upstash free)',
  },

  // ── Application Secrets ─────────────────────────────────────────────────
  {
    envVar:   'JWT_SECRET',
    provider: 'Internal (JWT signing)',
    domain:   'app',
    priority: 'required',
    pattern:  /^.{32,}$/,
    hint:     'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
  },
];

// ---------------------------------------------------------------------------
// KeyHolder Class
// ---------------------------------------------------------------------------

class KeyHolder {
  /** @type {Map<string, string>} loaded key values */
  #keys = new Map();

  /** @type {KeyStatus[]} last validation results */
  #statuses = [];

  constructor() {
    this.reload();
  }

  // -----------------------------------------------------------------------
  // Core API
  // -----------------------------------------------------------------------

  /** Re-read every key from `process.env` and re-validate. */
  reload() {
    this.#keys.clear();
    this.#statuses = KEY_REGISTRY.map((def) => {
      const raw = process.env[def.envVar]?.trim() ?? '';
      const present = raw.length > 0;
      let valid = true;
      let error;

      if (present && def.pattern && !def.pattern.test(raw)) {
        valid = false;
        error = `Value does not match expected format (${def.pattern})`;
      }

      if (present && valid) {
        this.#keys.set(def.envVar, raw);
      }

      return {
        envVar:   def.envVar,
        provider: def.provider,
        domain:   def.domain,
        priority: def.priority,
        present,
        valid:    present ? valid : true, // vacuously true when absent
        ...(error && { error }),
      };
    });
  }

  /**
   * Get a key value.  Returns `undefined` when the key is missing or invalid.
   * @param {string} envVar
   * @returns {string | undefined}
   */
  get(envVar) {
    return this.#keys.get(envVar);
  }

  /**
   * Convenience: get a key or throw if it is missing.
   * @param {string} envVar
   * @returns {string}
   */
  require(envVar) {
    const val = this.get(envVar);
    if (!val) {
      const def = KEY_REGISTRY.find((d) => d.envVar === envVar);
      throw new Error(
        `Missing required API key: ${envVar}` +
          (def?.hint ? `\n  → ${def.hint}` : ''),
      );
    }
    return val;
  }

  /**
   * Check whether a key is available (set + valid format).
   * @param {string} envVar
   * @returns {boolean}
   */
  has(envVar) {
    return this.#keys.has(envVar);
  }

  // -----------------------------------------------------------------------
  // Domain-specific accessors  (typed convenience wrappers)
  // -----------------------------------------------------------------------

  /** @returns {string} */        get groqApiKey()            { return this.require('GROQ_API_KEY'); }
  /** @returns {string|undefined} */ get openaiApiKey()        { return this.get('OPENAI_API_KEY'); }
  /** @returns {string|undefined} */ get anthropicApiKey()     { return this.get('ANTHROPIC_API_KEY'); }
  /** @returns {string|undefined} */ get googleAiApiKey()      { return this.get('GOOGLE_AI_API_KEY'); }

  /** @returns {string|undefined} */ get googleSearchApiKey()  { return this.get('GOOGLE_SEARCH_API_KEY'); }
  /** @returns {string|undefined} */ get googleSearchEngineId(){ return this.get('GOOGLE_SEARCH_ENGINE_ID'); }
  /** @returns {string|undefined} */ get serpApiKey()          { return this.get('SERPAPI_API_KEY'); }

  /** @returns {string|undefined} */ get newsApiKey()          { return this.get('NEWSAPI_KEY'); }
  /** @returns {string|undefined} */ get gnewsApiKey()         { return this.get('GNEWS_API_KEY'); }

  /** @returns {string|undefined} */ get cesiumIonToken()      { return this.get('CESIUM_ION_ACCESS_TOKEN'); }
  /** @returns {string|undefined} */ get mapboxToken()         { return this.get('MAPBOX_ACCESS_TOKEN'); }

  /** @returns {string|undefined} */ get aviationstackApiKey() { return this.get('AVIATIONSTACK_API_KEY'); }
  /** @returns {string|undefined} */ get openSkyUsername()     { return this.get('OPENSKY_USERNAME'); }
  /** @returns {string|undefined} */ get openSkyPassword()     { return this.get('OPENSKY_PASSWORD'); }
  /** @returns {string|undefined} */ get adsbxRapidApiKey()    { return this.get('ADSBX_RAPIDAPI_KEY'); }

  /** @returns {string|undefined} */ get marineTrafficApiKey() { return this.get('MARINETRAFFIC_API_KEY'); }

  /** @returns {string|undefined} */ get openWeatherMapKey()   { return this.get('OPENWEATHERMAP_API_KEY'); }

  /** @returns {string|undefined} */ get databaseUrl()         { return this.get('DATABASE_URL'); }
  /** @returns {string|undefined} */ get mongodbUri()          { return this.get('MONGODB_URI'); }
  /** @returns {string|undefined} */ get redisUrl()            { return this.get('REDIS_URL'); }

  /** @returns {string} */        get jwtSecret()             { return this.require('JWT_SECRET'); }

  // -----------------------------------------------------------------------
  // Health & Status
  // -----------------------------------------------------------------------

  /**
   * Full status of every registered key (safe for logs / health endpoint —
   * values are never included, only present/valid flags).
   * @returns {KeyStatus[]}
   */
  status() {
    return [...this.#statuses];
  }

  /**
   * Status grouped by domain.
   * @returns {Record<string, KeyStatus[]>}
   */
  statusByDomain() {
    return this.#statuses.reduce((acc, s) => {
      (acc[s.domain] ??= []).push(s);
      return acc;
    }, /** @type {Record<string, KeyStatus[]>} */ ({}));
  }

  /**
   * Returns an array of problems (missing required keys, invalid formats).
   * Empty array = healthy.
   * @returns {string[]}
   */
  problems() {
    /** @type {string[]} */
    const issues = [];
    for (const s of this.#statuses) {
      if (!s.present && s.priority === 'required') {
        const def = KEY_REGISTRY.find((d) => d.envVar === s.envVar);
        issues.push(`MISSING [required]  ${s.envVar} (${s.provider})${def?.hint ? ' — ' + def.hint : ''}`);
      }
      if (s.present && !s.valid) {
        issues.push(`INVALID FORMAT      ${s.envVar} (${s.provider})${s.error ? ' — ' + s.error : ''}`);
      }
      if (!s.present && s.priority === 'recommended') {
        issues.push(`MISSING [recommended] ${s.envVar} (${s.provider}) — some features will be degraded`);
      }
    }
    return issues;
  }

  /**
   * Print a startup banner to the console showing key status.
   */
  printStartupReport() {
    const ICONS = { present: '✅', missing_req: '❌', missing_rec: '⚠️', missing_opt: '⬜', invalid: '🔴' };

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║           ASURA — API Key Status Report                     ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const byDomain = this.statusByDomain();
    for (const [domain, keys] of Object.entries(byDomain)) {
      console.log(`  ── ${domain.toUpperCase()} ${'─'.repeat(54 - domain.length)}`);
      for (const k of keys) {
        let icon;
        if (k.present && k.valid)        icon = ICONS.present;
        else if (k.present && !k.valid)  icon = ICONS.invalid;
        else if (k.priority === 'required')    icon = ICONS.missing_req;
        else if (k.priority === 'recommended') icon = ICONS.missing_rec;
        else                             icon = ICONS.missing_opt;

        const status = k.present ? (k.valid ? 'OK' : 'INVALID') : 'NOT SET';
        console.log(`    ${icon}  ${k.envVar.padEnd(30)} ${status.padEnd(10)} [${k.priority}]`);
      }
      console.log('');
    }

    const probs = this.problems();
    if (probs.length) {
      console.log('  ⚠  Issues:');
      probs.forEach((p) => console.log(`     • ${p}`));
      console.log('');
    } else {
      console.log('  ✅  All required keys are configured and valid.\n');
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

/** @type {KeyHolder} */
const keyHolder = new KeyHolder();

module.exports = { KeyHolder, keyHolder, KEY_REGISTRY };
