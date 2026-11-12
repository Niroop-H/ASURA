# ASURA / DEVASHRI — Connector activation and operational validation plan
_Updated 12 November 2026. A connector is not an operationally approved observation source._

## Verified code presence versus actual access

The on-demand public-source assurance API registers **19** source contracts. Those contracts describe checks; they do not guarantee upstream availability. Some publishers can reject datacenter requests, throttle, change schemas, or omit timestamps.

| Source ID | What code actually retrieves | Scope / important limitation | Release posture |
|---|---|---|---|
| faa_nas | FAA NAS airport-status XML | Published airport traffic management reports, not air traffic radar/flight clearance | Probe only |
| faa_tfr | FAA published TFR list | Aggregate counts, including future notices; not complete NOTAM clearance | Probe only |
| nws_alerts | NWS US-state active-alert GeoJSON | Named state only; quiet feed not proof of safe weather | Probe only |
| fema_disasters | FEMA recent disaster declarations | Historical administrative records, not current hazard intensity | Probe only |
| cisa_ics | CISA ICS RSS headlines | Defensive advisory metadata; provider may block automated retrieval | Probe only |
| nrc_events | NRC event RSS count | Aggregate feed entries, not a facility map/status service | Probe only |
| imf_portwatch | IMF PortWatch catalogue index | Discovery only, **no daily trade readings or AIS** | Not a measurement |
| noaa_swpc_kp | NOAA observed planetary Kp index | Three-hour global geomagnetic readings; not localized GNSS-jamming evidence | New; CI-validated parser |
| nasdaq_halts | Nasdaq trade-halt RSS | **BLOCKED by default** until authorized acceptance of provider terms; no market prices | New; licence gate |
| federal_register | Federal Register API published documents | Publication data, not proof a law is effective or binding | New; CI-validated parser |
| fcdo_travel | GOV.UK Content API travel-advice page | One named supported country; pilot check uses India | New; CI-validated parser |
| gdacs_alerts | GDACS published 24-hour multihazard RSS | Published alerts, not independently certified local warnings | Read-only integration; runtime checks required |
| uscg_lnm | USCG Local Notice to Mariners GovDelivery RSS | Only a single district's published notices; not a worldwide navigation service | Read-only integration; runtime checks required |
| nasa_donki | NASA DONKI geomagnetic storm events | Interpreted event reports; NASA DEMO_KEY subject to strict public quota | Read-only integration; runtime checks required |
| treasury_debt | US Treasury debt-to-the-penny API | Published accounting balances, exact USD decimal strings; not tick data | Read-only integration; runtime checks required |
| dvids_news | DVIDS public media news search | Official published releases; requires registered DVIDS_API_KEY | BLOCKED without key |
| imf_portwatch_daily | IMF PortWatch ArcGIS Daily_Ports_Data table | Small delayed port-level sample only; no AIS tracks or worldwide aggregate | BLOCKED pending written reuse permission |
| sec_suspensions | SEC official trading suspension RSS notices | Publication of enforcement action, not exchange status or tick data | Read-only metadata; runtime checks required |
| noaa_ndbc_buoy | NOAA NDBC fixed buoy 46042 meteorological readings | Provisional wind speed (m/s), significant wave height (m); one offshore station only | Read-only; runtime checks required |

All 17 sources are available to the **readiness probe**. The AI source selector can request sources by name, but the assistant must show publisher versus retrieval timestamps and evidence links rather than assert they are verified in production.

## Verification automation (no deployment required)

- GitHub workflow `.github/workflows/public-source-smoke.yml` probes 14 keyless public-source endpoints twice daily (02:19 and 14:19 UTC), with a manual trigger as well.
- The runner stores the sampled HTTP/schema/freshness statuses and raw-response hashes in `artifacts/public-source-smoke.json`, uploaded as a GitHub Actions artifact with 14-day retention. This is **temporary independent sampling**, not signed immutable storage or an SLA.
- It never injects API keys into the browser or reports. Explicitly blocked sources (Nasdaq terms, DVIDS credential, IMF reuse approval) are not polled.
- The canonical source list contains 17 contracts; a run returning no parseable public provider reports failure, while individual provider failures appear as DOWN with their reason.
- Run locally with `node scripts/probe-public-sources.cjs` (Node 22+ with network access), or run the **Public-source external smoke observations** GitHub Actions workflow manually.
- To register DVIDS, obtain a key at https://api.dvidshub.net/, add `DVIDS_API_KEY` to server-only environment secrets, and review the DVIDS API terms. Public media does not establish independent event truth.
- To enable IMF daily observations, obtain documented permission for this application's systematic/commercial data reuse, then set `IMF_PORTWATCH_REUSE_AUTHORIZED=true` server-side. The default remains BLOCKED. Never confuse published delayed daily estimates with licensed vessel AIS.
- Optional `NASA_API_KEY` avoids dependence on the shared DEMO_KEY quota for DONKI.
- Local unit/fixture contract tests run using `npm run test:operational`, followed by `npm run build`. Neither is a real provider availability test.

## Immediate next acquisition packages

| Priority | Requested source family | Acquisition path / permission gate | Verification before enabling |
|---|---|---|---|
| P0 | IMF PortWatch daily trade | Identify the official time-series/data download service and commercial reuse policy; do not confuse OGC catalogue results with AIS or trade readings | Units, dataset vintage, daily lag, revised values, license |
| P0 | FAA NOTAM / SWIM | Use FAA authorized data distribution and developer accounts if necessary. FAA NAS and public TFR are only partial substitutes | Full-notice coverage, update latency, registration rights |
| P0 | CISA/ICS and vendor PSIRT | Existing CISA RSS plus official vendor advisory feeds; monitor 403/rate limits and keep metadata only | CVE mapping, advisories' effective dates, false positives |
| P0 | Market integrity | SEC latest filings and trading suspensions; separate official NYSE/Nasdaq halt feeds with confirmed allowed use | Exchange sessions and weekend quiet periods, rights, time zone, provenance |
| P0 | Maritime warnings | NAVCEN/USCG and MARAD official public notices; UKMTO/JMIC use only documented public distributions | Notice expiry, supersession, region, licensing |
| P1 | Defense public statements | DVIDS API (free API credential if available), DoD, State, NATO official feeds | Distinguish statements and imagery from verified events |
| P1 | Economic nowcasts | Atlanta Fed GDPNow, NY Fed WEI, published EIA/TSA/Fed series | Release calendar, historic revisions, point-in-time vintage |
| P1 | Grid and energy | EIA-930, DOE/ODIN published aggregates, ENTSO-E/ISO official releases | Country/market restrictions, no vulnerable-facility mapping |
| P1 | Space & weather | CelesTrak/Space-Track with permissions, NOAA SWPC (Kp added), NASA DONKI | Observed vs forecast, orbital epoch, re-entry uncertainty |
| P1 | Travel risk | FCDO country pages (added), US State Department official advisories | Country scope, date, superseded notices, no blanket safety assessment |
| P2 | SondeHub / NOAA sounding | Published balloon telemetry and upper-air profiles | Receiver gaps, observation time, resampling and authorization |
| P2 | Disaster / health / trade / cyber | GDACS, Copernicus EMS, CDC/WHO aggregates, USDA/FAO, defensive threat indicators | Provider terms, refresh cycles, geospatial privacy and aggregation |

## Hard external dependencies

- **Licensed AIS:** an authorized vessel-data account, agreed permitted fields and redistribution rights. No workarounds around privacy blocking, paid endpoints, or regional restrictions.
- **Global public cameras:** only operator-authorized catalogues and videos. Universal live CCTV is neither public nor technically possible to guarantee; no identity tracking.
- **Proprietary financial prices:** paid exchange/vendor agreements and delayed-versus-real-time entitlement checks. Halt notices are not price quotes.
- **Large Groq vision model:** model access depends on the specific account/provider entitlements. Probe available models, obtain permitted access or select a clearly labeled tested substitute; never describe a text-only model as vision capable.
- **Specialist government datasets:** official registration, published export, manual data-use agreement or authenticated API. Missing approvals must show BLOCKED/UNAVAILABLE in the source health page.

## Reliability architecture needed before operational acceptance

1. **Collectors:** provider-specific HTTPS allowlist, sensible timeouts, per-host rate quotas, ETag support, bounded payloads, schema versions, validation of numeric units and observed/published times. Avoid uncontrolled scraping.
2. **Durable evidence:** store raw response checksum, normalized records, publication vintage, retrieval time, dataset revision, source URL, schema version and immutable audit event in a database/object store. A transient response hash alone is insufficient.
3. **Heartbeat and staleness:** independent scheduled checks for each source. Preserve last attempted and last successful pull, expected provider cadence, empty-but-valid state, blocked-by-terms state, HTTP 403/429/backoff, stale content, and deployment health.
4. **Cross-source checks:** compare only equivalent metrics and time windows; display disagreement with both unmodified records and no fabricated consensus.
5. **Alerts:** human-readable rule IDs, confidence/limitations, originating evidence URLs, thresholds, suppression rules, acknowledgement and incident triage. Avoid target lists or user/person surveillance.
6. **Deployment and security:** SSO/MFA, role-based access, server-only credentials, secret rotation, signed evidence archives, legal review, privacy constraints and a tested disaster recovery plan. No public API should expose arbitrary collector URLs.
7. **Acceptance:** 30 days uptime monitoring and independently reviewed samples, 200 reviewed questions per relevant domain, fail-injection (timeouts, 403, 429, malformed schemas, stale/future timestamps), documented measured thresholds, signed approval for the specified authorized use case.

### Operator procedure for this branch

1. Wait for the GitHub workflow to finish: contract tests and Next production build.
2. Deploy only after code review; set credentials in Vercel project environment secrets, **not** in source files.
3. For public sources with no key, run the readiness page at /readiness and export the report. A green response means transport/schema success, not certified operation.
4. For Nasdaq, leave NASDAQ_HALTS_TERMS_ACCEPTED=false until an authorized administrator has accepted the applicable published feed terms. The source will display BLOCKED and emit no records.
5. Verify individual raw hashes, official URLs and publication clocks. Store a timestamped evidence pack outside ephemeral serverless memory.
6. Require separate legal, safety, security and accuracy sign-off before any operational-use label or automated decision is enabled.

## Real-provider smoke monitoring (code-only, no production deployment)

The automated `.github/workflows/public-source-smoke.yml` GitHub Actions check executes `scripts/probe-public-feeds.mjs` four times daily (scheduled GitHub runs are best-effort, not a guaranteed SLA) and on manual dispatch. This lightweight Node runner requests 16 previously allowlisted public endpoints in bounded groups of three with 10-second per-source timeouts. Trading-halt, DVIDS, and PortWatch commercial reuse/credential-gated integrations are intentionally excluded.

Each report stores a transport state, content freshness, reason, retrieval time, elapsed milliseconds, sample count and two checksums. It does **not** store records or credentialed provider responses. Workflow artifacts are retained for 30 days, subject to GitHub storage policies. Success of the workflow means the monitoring script completed; an individual source may still be DOWN or STALE, and the exact source-level result must be inspected.

Run locally (no credentials needed): `node scripts/probe-public-feeds.mjs --sources=noaa_swpc_kp,federal_register --output=artifacts/manual-public-probe.json`. Invalid source IDs and paths fail immediately. This command deliberately does not promote any provider to operational-accepted status.

**Next engineering acceptance step:** review report artifacts across a meaningful observation window, check provider terms and real source schemas, then establish a permanent authorized evidence store, access controls, alert thresholds and a signed acceptance decision. No GitHub workflow is a substitute for those controls.
