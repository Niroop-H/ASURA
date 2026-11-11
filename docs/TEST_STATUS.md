# Test status — 2026-11-11

## Story
When no observation integration or evidence retrieval exists, the user sees unavailable/unassessed states and the API cannot emit an unsourced model answer as retrieved intelligence.

| Check | Result |
| --- | --- |
| Baseline npm ci --ignore-scripts | Failed: package-lock did not match package.json |
| npm install --ignore-scripts --no-audit --no-fund | Passed; repaired lockfile. Installer warned Next.js 14.2.18 has a security vulnerability |
| npm run build | Passed, including final source changes; all 16 build entries generated |
| node --test tests/data-integrity.test.mjs | 4 tests passed, 0 failed |
| Production HTTP pages /, /map, /tracking, /query, /compliance, /settings | All 200; checked removal of false live/readiness/IFF labels |
| Production query API, normal and stream=true | Both 503, answer null |
| Production audit API | No seeded records; verification valid null |
| Production compliance API | overallScore null |
| git diff --check | Passed |
| Browser visual / mobile QA | Not completed: bundled Playwright browser absent; system Chromium blocked by socket permission restrictions |

Regression tests execute the actual query/compliance route source with the NextResponse JSON adapter replaced by Web Response.json. Production HTTP checks separately verified real Next handlers. No external provider credentials or live feeds were tested. Successful build/HTTP checks do not establish operational readiness, security, source accuracy, or feature parity.
