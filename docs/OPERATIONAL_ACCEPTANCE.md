# ASURA Defense Intelligence System™ — Operational acceptance

Developed by MAH Quantum | Initiated 12 November 2026
**STATUS: DEVELOPMENT ONLY — NOT CERTIFIED FOR OPERATIONAL USE.**

## Release gates

1. **Development (current):** authorized public read-only sources, bounded requests, schema tests, source/retrieval clocks, manual health checks and one-response evidence hashes.
2. **Pre-operational pilot:** SSO/MFA, RBAC/ABAC, protected user and query audit, immutable evidence storage with signatures/hash chain, validated licences, geographic scope and documented outage procedures.
3. **Operational acceptance:** 30 days monitored source uptime, third-party security review, independent accuracy evaluation, signed operational/legal acceptance for a specific non-targeting use case and accountable human operator approval. The ASURA name is not a defence certification.

## Proposed measurable targets — NOT yet achieved

| Metric | Planned release gate |
|---|---|
| Provider uptime | >=99.5% contract-valid retrievals across 30 consecutive days, calculated by provider/region |
| Display freshness | 100% of observations show publisher time or UNKNOWN and ASURA retrieval time |
| False live assertions | Zero in >=200 independently reviewed questions per domain |
| Clock accuracy | 100% parseable times UTC with clear forecast/observed/administrative distinction; future timestamps cannot be fresh |
| Provenance | 100% records carry source, URL, licensing and dataset-vintage metadata when published |
| Integrity | Independent reproduction of the record hash plus immutable signed archived payloads |
| Cross-source | Visible disagreement, original records and human review; no fabricated consensus |
| Latency | P95 public-source lookup below 12 seconds in deployed regions |
| Fail-closed | 99%+ injected outages, malformed responses, stale timestamps and 429s lead to explicit degraded/down states |
| Security | MFA/SSO, per-role access, secrets audit, rate limits, least privilege and authorized independent penetration test |
| Response plan | Named owner, tested rollback and incident response, backup restore test and alert on collector failure |

None of these metrics constitutes a certified operational readiness result until measured against a signed test plan, independently verified and approved.

## Initial sources and freshness contracts

| Source ID | Proposed polling interval | Max content age | Meaning |
|---|---|---|---|
| faa_nas | 5 min | 20 min | US airport status, not flight clearance |
| faa_tfr | 15 min | 1 day | Counts of published TFR categories including future notices |
| nws_alerts | 5 min | 1 hour | Active NOAA warnings for named US state; no alerts does not mean no danger |
| fema_disasters | 6 hours | 7 days | Recorded declarations, not live incident readings |
| cisa_ics | 1 hour | 7 days | Defensive ICS advisories, not compromise detection |
| nrc_events | 6 hours | 1 day | Aggregate publicly listed event entries, not real-time facility condition |
| imf_portwatch | 24 hours | 7 days | Dataset catalogue only, NOT port throughput/AIS or live trade data |

These are thresholds for the newest item, not proof that the provider is functioning or producing new events. An event-driven feed can legitimately be quiet. A response must show transport and content status separately. Unknown publication time is UNKNOWN rather than LIVE.

## Validation procedure

1. Validate actual official endpoint, terms, permitted commercial reuse, quotas and attribution.
2. Inspect source schema, units, geography, publication time, access rights and revision policy.
3. Write fixtures for success, empty responses, invalid XML/JSON, missing publication time, future timestamp, retries, HTTP 429/5xx and outages.
4. Run npm run test:operational and npm run build. These are build gates, not performance evidence.
5. Run operator-initiated /readiness checks and export the source evidence pack; verify SHA-256 and sampled official URLs independently.
6. Persist signed normalized records, original data, query inputs, source vintage and trace IDs in a protected database. This **has not been implemented**; current hashes are transient and unsignatured.
7. Complete 30-day independent telemetry and geographic quality checks, 200+ manually verified questions per sector, security review, fault injection, backup restore, privacy and legal review.
8. Obtain written acceptance for specific activities and authorized operating roles. Do not label the entire platform globally certified.

## Unconnected providers and decisions

**Next public/official sources:** SEC EDGAR and trading suspensions, Federal Register, NWS coastal/buoy data, USGS aggregate flood gauges, NASA DONKI, MARAD and government travel advisories, WHO/CDC aggregate health, EIA national published energy and commodity releases. Add only after verifying API policy and source terms, parser/clock tests, licensing and health contracts.

**IMF PortWatch:** the public dataset catalogue is reachable; no daily port/trade estimates were integrated. Identify the authoritative published dataset service, commercial licence and timestamp contract first; do not claim catalogue metadata is an AIS stream.

**FAA SWIM/NOTAM and EUROCONTROL:** access permissions/registration may be required. Public NAS status is not a complete flight-operations system.

**AIS, CCTV and live financial exchange prices:** provide only documented public or explicitly authorized feeds. Paid/licensed sources are UNAVAILABLE until valid rights/credentials/budget exist; no scraping around privacy blocks or rebroadcasting restricted streams.

**Large vision model:** text GPT-OSS 120B was previously verified; the requested large multimodal option requires actual model-provider permission and a visual-evidence evaluation. Do not silently substitute a smaller visual model.

**GNSS, grid and nuclear reports:** aggregate/public-safety notices only; no vulnerable-facility list, tactical interruption map or real-time targeting use.

**Cost:** free public data can support prototyping, but no 24/7 worldwide operational SLA can be guaranteed at zero budget. Persistent audit storage, on-call response, secure infrastructure and licensed sources have real costs.

**Security and integrity:** imported provider content is untrusted evidence, never instructions. Agent tools remain read-only; no unrestricted provider URLs, secret disclosure, unauthorized scanning, person-following or operational commands. Human accountability and oversight remain mandatory.
