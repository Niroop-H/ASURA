# ASURA Blue Team — Defensive Analytics Engine

## Delivery boundary

The site has a new **Blue Team** page at \`/blue-team\`, with exactly 50 user-supplied upstream security repository references across eight domains. All 50 are explicitly marked **NOT CONNECTED**. These are **not** deployments of the referenced software.

The delivered engine is a real, deterministic **browser-local** security-event normalization, detection and reporting workflow; it can analyze authorized redacted exports without sending them to the ASURA backend. It is not a persistent SIEM, live security sensor, military accredited system, host EDR, WAF, incident-response agent, or an automatic blocking service.

The supplied list combines actual browser tools, web-administered servers, engines, rulesets, desktop applications, libraries and CLI tools. In particular, an entry's GitHub link or its integration with a separate dashboard does not mean it can run natively inside an ordinary browser.

## Functional capabilities now implemented

1. **Catalogue/search:** 50 numbered tool references, descriptions, categories, application types, external project links and current non-connected state.
2. **Offline imports:** normalized event JSON, JSONL, a documented subset of exported Wazuh alerts, and JSON vulnerability results from Trivy. The engine **does not** silently assume other upstream export schemas are supported.
3. **Normalization:** strict fields only, maximum 500 events and 256,000 characters per import, invalid record rejection, event ID/asset/source deduplication, explicit source tags and never retaining raw HTTP headers, command lines, malware payloads, or password fields.
4. **Defensive correlation:** eight deterministic rule checks covering repeated login failures, WAF blocks, unapproved identity privileges, audit configuration changes, serious endpoint alerts, critical vulnerability findings, explicit high-confidence observed IOC matches and unapproved high-volume egress summaries.
5. **Evidence-oriented output:** alert rule ID, source, time (when reported), asset label, matched event IDs, severity and an analyst triage recommendation. No automatically inferred confirmed compromise.
6. **Data-quality reporting:** accepted, invalid and deduplicated records; timestamps that are known, missing, older than 24 hours or beyond acceptable future clock skew.
7. **Built-in synthetic exercise:** an in-browser demonstration exercises all eight rule types using explicitly labelled fictional asset names and events.
8. **Portable local report:** exports JSON with rule outcomes and provenance disclaimers. Export is neither signed nor tamper-evident.

The page has **zero API keys**, third-party OAuth flows, SIEM credentials, connected providers or automated response permissions. Import and analysis operate in the visitor's browser session and use no outgoing network requests for event analysis.

### Example normalized events

\`\`\`json
[
  {
    "id": "auth-01",
    "source": "wazuh/wazuh",
    "type": "auth-failure",
    "asset": "authorized-training-host",
    "actor": "test-principal",
    "outcome": "failure",
    "observedAt": "2026-11-13T10:00:00Z"
  },
  {
    "id": "vuln-01",
    "source": "aquasecurity/trivy",
    "type": "vulnerability",
    "asset": "sample-container",
    "severity": "critical",
    "score": 9.8,
    "resolved": false
  }
]
\`\`\`

Other supported normalized event types:
\`waf-block\`, \`iam-change\`, \`audit-change\`, \`endpoint-alert\`,
\`intel-match\`, \`network-flow\`, and \`case-alert\`.
Source identity is **user-supplied**, not verified by ASURA. Event timestamps must not be treated as authenticated without separate validation. Threat intelligence references by themselves do not equal observed incident matches.

## Providers and what remains to connect

The catalogue marks potentially useful exporters, but none of the following integrations is currently provisioned or independently tested:

| Integration wave | Potential systems | Actual next requirement |
|---|---|---|
| 1. Read-only monitoring | Wazuh, Graylog, OpenSearch, Loki, Security Onion | Named deployment, provider auth, export schema review, read-only API/agent permissions, synthetic/pilot test, health/freshness contract |
| 2. Vulnerability posture | Trivy, DefectDojo, Faraday, Greenbone, Fleet | Confirm sanctioned asset scope; approved export mapping and score/version provenance |
| 3. CTI correlation | MISP, OpenCTI, Yeti | Consent and terms, feed revision IDs, observed match separate from indicator publication |
| 4. Cases and workflows | TheHive, DFIR-IRIS, Tracecat, Shuffle | Case event provenance and read-only case status first; any mutation needs independent review |
| 5. Edge and network | Coraza/CRS, CrowdSec, SELKS, Arkime, ntopng | Secure telemetry collection; avoid bypassing access controls or collecting raw packets indiscriminately |
| 6. Forensic/malware research | CyberChef, Velociraptor, CAPE, DRAKVUF, Autopsy | Strictly isolated analysis/forensic infrastructure; never detonate malware in the ASURA web server |

A full 50-tool runtime cannot be credibly claimed by installing fifty repositories in a web frontend. Many require dedicated Linux hosts, daemons, agents, separate storage systems, nontrivial licensing and security approvals. Several repositories are libraries, rule packages or client utilities, not remotely controllable SOC servers.

## Required path to operational deployment

- **Access control:** SSO/MFA, least-privileged roles, device and network restrictions; deny unauthenticated ingestion.
- **Collector isolation:** individually reviewed read-only provider connections with egress allowlists, TLS validation, per-tenant credentials and quotas. Never accept arbitrary target URLs or send secrets to browsers.
- **Persistent evidence:** encrypted storage, tenant separation, source URL, producer event ID, observed/ingested time, schema version, source heartbeat, integrity hash, retention, legal policy and reproducible case reports.
- **Live detection quality:** independently labelled positive and negative data, time-series replay tests, measured false-positive rate/precision/recall under realistic volumes, drift monitoring, explainable detections and incident response handoffs.
- **Response gating:** human analyst approval and signed runbooks for containment; no default automatic quarantine, bans, credential revocation, infrastructure controls or malware execution.
- **Safety:** no real classified/military/critical-infrastructure telemetry without appropriate accredited environment and documented authority.
- **Provider reality:** authenticate each independently, verify its version and licensed use, confirm actual permission and results, and fail visibly when the source is stale or down.

## Developer verification

\`\`\`bash
npm run test:blue-team
npm run test:red-team
npm run test:operational
npm run test:vision
npm run test:news
npm run build
\`\`\`

The Blue Team suite tests all 50 references, browser-local synthetic rules, privacy-preserving field selection, Wazuh/Trivy import subsets, rejection of invalid/oversized exports and missing/future timestamps, and no external network dependencies.

**Status:** offline defensive analysis implemented; 0/50 third-party products connected. Deploying the website does not install any of those 50 services.
