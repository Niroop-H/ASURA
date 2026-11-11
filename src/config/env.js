/**
 * ASURA Configuration Loader
 * ==========================
 * Loads `.env` (via dotenv) and initialises the KeyHolder singleton.
 * Import this file once at application entry before anything else.
 */

const path = require('path');

// Load .env from project root (one level up from /src)
require('dotenv').config({
  path: path.resolve(__dirname, '..', '..', '.env'),
});

const { keyHolder } = require('../services/keyHolder');

/**
 * Boot-time environment check.
 * Call this from your server entry point.
 * @param {{ strict?: boolean }} options
 *   strict = true  → throw on any required-key problem (default for production)
 *   strict = false → log warnings only
 */
function validateEnvironment({ strict } = {}) {
  const isProduction = process.env.NODE_ENV === 'production';
  const shouldThrow = strict ?? isProduction;

  // Reload in case env was patched after import
  keyHolder.reload();
  keyHolder.printStartupReport();

  const problems = keyHolder.problems();
  const critical = problems.filter((p) => p.includes('[required]'));

  if (critical.length > 0 && shouldThrow) {
    throw new Error(
      `ASURA cannot start — ${critical.length} required key(s) missing:\n` +
        critical.map((c) => `  • ${c}`).join('\n'),
    );
  }
}

module.exports = { validateEnvironment, keyHolder };
