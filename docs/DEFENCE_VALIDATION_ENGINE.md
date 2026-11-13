# ASURA Defence Validation Engine — 0.1.0-lab

**Scope:** offline, deterministic, synthetic defender control testing. This is **not** an operational military security system, a live red-team orchestrator, a penetration-testing service, or an endorsement, certification, or directive from any government or OpenAI representative.

## What the engine actually does

The Red Team page at \`/red-team\` now offers:

- \`defence-drill\`: runs six independent detection checks against twelve deliberately synthetic training cases. It does not contact assets or run code in the supplied red-team repositories.
- \`integration-matrix\`: maps all 50 supplied repository references to prospective *defensive review* purposes, listing lab isolation, licence review and asset-owner approval prerequisites. Every entry remains reference-only, not installed.
- Existing catalogue search, inventory, permission-first checklist and one-at-a-time GitHub reference checks continue to work.

### Detection checks

| Scenario | Defensive indicator | ATT&CK label | Synthetic-positive / benign cases |
|---|---|---|---|
| \`auth-burst\` | At least five failed logins within one minute | T1110 | 1 / 1 |
| \`cloud-change\` | Unapproved privileged cloud policy change | T1098 | 1 / 1 |
| \`endpoint-script\` | Unsigned, unapproved script metadata | T1059 | 1 / 1 |
| \`secret-exposure\` | Unresolved, synthetic credential-pattern alert metadata | T1552 | 1 / 1 |
| \`audit-disabled\` | Unapproved audit-logging disablement | T1562 | 1 / 1 |
| \`egress-anomaly\` | High-volume, unapproved outbound transfer metadata | T1041 | 1 / 1 |

The engine returns trigger IDs, evidence record IDs, defensive recommendations, synthetic case outcomes and a confusion matrix (TP, FP, TN, FN). Its measured precision/recall/accuracy refer **only to the built-in synthetic examples**; they are not evidence of actual detection performance.

### API requests

\`POST /api/red-team\`:

\`\`\`json
{"action":"defence-drill","scenario":"all"}
\`\`\`

\`\`\`json
{"action":"defence-drill","scenario":"auth-burst"}
\`\`\`

\`\`\`json
{"action":"integration-matrix"}
\`\`\`

Only the predefined six scenario IDs or \`all\` are accepted. Arbitrary commands, URLs, user-uploaded active payloads, network targets and privileged security tool invocations are rejected or unavailable.

### Limitations and security decisions

1. There is **no C2 connection, payload dispatch, credential capture, remote shell, intrusion pathing, phishing automation or third-party offensive-tool installation**.
2. Telemetry comes only from checked-in synthetic fixtures. No SIEM/EDR, network logs, classified data, aircraft/critical infrastructure systems or cloud credentials are connected by this change.
3. The engine never performs external network requests when running a drill. GitHub metadata verification is a separate, manually triggered, allowlisted read-only action.
4. The exported report is an **unsigned, portable JSON self-test**. It is not a tamper-proof audit record or an authorization certificate.
5. No signed rules of engagement, classified-environment accreditation, deployment identity, military authority, live detection evaluation, or availability SLA is established.
6. A reported claim of instructions from Sam Altman or the U.S. Department of Defense is **not independently verified** and cannot substitute for documented contract scope and access authorization.

### Path to legitimate operational use

After signed owner authorization, engage a designated security professional to define:
- Environment boundaries, protected information classifications and approved data-handling pathways;
- Separately isolated and access-controlled sandbox for safe tests, never the ASURA web server;
- Baseline SIEM/EDR record schemas and historical redacted defensive-event ingestion (not attacker command execution);
- Detection rule provenance, signed approvals, versioning, audit retention, meaningful independent positive/negative datasets, sensitivity, precision and false-positive targets;
- Change-management and emergency stop mechanisms, including network egress restrictions and human review;
- Tool-specific licences and supply-chain checks for *separately* approved, limited-scope defensive modules.

Only after these gates should any actual log ingestion or third-party passive audit integration be evaluated. The presence of a name in the 50-repository catalogue grants no authorization.

## Testing

\`\`\`bash
npm run test:red-team
npm run test:operational
npm run test:news
npm run test:vision
npm run build
\`\`\`

\`tests/defenceValidationEngine.test.cjs\` checks all six scenarios, twelve cases, deterministic metrics, invalid-scenario failure, the 50-row matrix and lack of network access. Pull-request CI also checks the existing Red Team API and the Next.js production build.

**Status:** code-level synthetic validation only. Deployment remains outside this work.
