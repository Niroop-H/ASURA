# ASURA handoff — truthful data status

Date: 2026-11-11
Baseline commit: 3961d2ed41b36e48955036ac7bedada8c52a9635

## Completed
Removed fabricated map/track records, measurements, readiness scores, compliance scores, classification markings, simulated query progress, and seeded audit events. Views now explicitly report unavailable data. Source enablement and credential configuration are not represented as verified connectivity. Query API fails closed with HTTP 503 for ordinary and streaming requests because no evidence retrieval is implemented. Compliance reports are unassessed; audit verification is unknown. Repaired the dependency lockfile.

## Audit findings
- MapView was an illustrative SVG with hardcoded positions; no Cesium dependency exists.
- TargetTracker contained hardcoded military identities, IFF labels, and fixed relative timestamps.
- Dashboard and charts displayed constant metrics and fabricated recent events.
- Query route supplied registry descriptions to Groq, not retrieved evidence. Its streaming code also expected an async iterable from a function returning a Promise of a stream.
- Compliance controls/scores and passing declarations were constants; audit verification always returned true without checking hashes.
- Source registry and audit state are process-local. No authentication/RBAC foundation is present in inspected routes.
- Original npm ci failed because the lockfile only described dotenv.

## Upstream integration status
Reference: https://github.com/bilawalsidhu/gods-eye-view
The upstream root and LICENSE were inspected. Its code license is MIT; bundled datasets, models, and runtime provider data have separate terms, including noncommercial assets. No upstream code or datasets were imported in this change. Full feature parity has NOT been audited or implemented. Merely adding a Cesium token cannot activate a renderer that is absent from ASURA.

## Architecture and behavior
Retained Next.js and existing routing/configuration structure. Unavailable views share DataUnavailable; no fabricated fallback records. Existing Groq client is no longer reached by the public query API. No new external feed, paid service, database, or retention change was enabled. No operational military tracking or targeting capability was added. APIs have intentional contract changes: compliance overallScore and audit valid are null; query returns 503.

## Validation
See docs/TEST_STATUS.md. Build and four regression tests pass; production HTTP smoke checks pass. Visual browser QA is blocked by runtime restrictions.

## Remaining blockers and next tasks
1. Upgrade the vulnerable pinned Next.js version and review dependencies before deployment; npm emitted a security advisory warning for 14.2.18.
2. Establish authenticated identity and role/tenant authorization before exposing mutable APIs. Audit POST currently accepts caller-supplied events; they are not independently verified.
3. Review source permissions and catalogue actual upstream capabilities separately from planned functionality; preserve code attribution when importing permitted modules.
4. Implement a civilian public-event evidence connector with provenance and distinct observed/retrieved timestamps, explicit failures, validation, and freshness rules.
5. Connect evidence to a real geographic renderer and accessible list view; no fabricated fallback positions.
6. Re-enable evidence queries only after server-side acquisition exists and returned claims can be traced to retrieved records.
7. Implement durable bounded configuration/audit storage and real audit verification. Memory logs are neither durable nor certified.
8. Replace legacy docs/screenshots that describe prototype capabilities. README now marks them as historical, unverified descriptions.
9. Perform visual desktop/mobile QA and independent security/data-quality assessment. No operational readiness or certification is claimed.

## Files changed
- `ASURA_HANDOFF.md`
- `README.md`
- `docs/TEST_STATUS.md`
- `package-lock.json`
- `src/app/api/compliance/route.js`
- `src/app/api/health/route.js`
- `src/app/api/query/route.js`
- `src/app/compliance/page.jsx`
- `src/app/layout.jsx`
- `src/app/map/page.jsx`
- `src/app/page.jsx`
- `src/app/query/page.jsx`
- `src/app/settings/page.jsx`
- `src/app/sources/page.jsx`
- `src/app/tracking/page.jsx`
- `src/components/ActivityFeed.jsx`
- `src/components/DataUnavailable.jsx`
- `src/components/DefenseMetricsChart.jsx`
- `src/components/Header.jsx`
- `src/components/KeyStatusPanel.jsx`
- `src/components/MapView.jsx`
- `src/components/QueryInterface.jsx`
- `src/components/Sidebar.jsx`
- `src/components/SourceCard.jsx`
- `src/components/TargetTracker.jsx`
- `src/components/ThreatRadarChart.jsx`
- `src/lib/auditLogger.js`
- `src/lib/complianceData.js`
- `tests/data-integrity.test.mjs`
