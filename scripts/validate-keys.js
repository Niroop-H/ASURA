#!/usr/bin/env node
/**
 * Quick-check script: validates all API keys and prints the status report.
 *
 * Usage:
 *   node scripts/validate-keys.js
 */

// Load env first
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const { keyHolder } = require('../src/services/keyHolder');

keyHolder.reload();
keyHolder.printStartupReport();

const problems = keyHolder.problems();
if (problems.length > 0) {
  console.log(`\n⚠  ${problems.length} issue(s) found. See above.\n`);
  process.exit(1);
} else {
  console.log('🚀  All keys look good. Ready to start ASURA.\n');
  process.exit(0);
}
