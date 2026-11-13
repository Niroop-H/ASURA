# ASURA DEFENSE CORE — Render Free and Vercel deployment

**Scope:** development-grade, signed, bounded defensive orchestration. This change DOES NOT install 50 live SOC platforms, guarantee uptime, create an accredited military system, or make the audit records persistent.

## Architecture

- **Vercel:** Next.js 14 /defense page, operator-token authorization, Render request signing, signed stream validation, approval interface, KeyHolder domain named defense, and in-process SHA-256 chain/Merkle-root audit.
- **Render:** Python 3.11 FastAPI in /backend, GET /health, signed GET /tools, POST /autonomous/execute (SSE), POST /autonomous/approve, optional signed callbacks to Vercel. No local ML model.
- **Groq:** configured llama-3.3-70b-versatile model with native typed tool calling when the key permits it. The model can propose actions, not grant asset authorization.
- **Registry:** 50 references are typed; eight Tier-1, five Tier-2, and 37 Tier-3. A registered project does NOT mean it is installed or connected. External SOC bridging requires separate infrastructure.
- **Docker image:** FastAPI, uvicorn, httpx, Groq SDK, curl, jq, yara and Trivy (official signed apt repo). Local CLI activity is restricted to version diagnostics. Do not run Trivy database scans or malware detonation inside the 512MB coordinator.
- **High risk:** short-lived human-bound proposal and SHA-256 seal. Execution requires signed approval, exact asset allowlist, an approved idempotent external SOC bridge and ASURA_ENABLE_CONTAINMENT=true (default false).

## $0 limits and memory reality

Render Free offers a 512MB container and a shared 750 instance-hour budget per workspace each calendar month. A service can spin down after 15 minutes with no traffic and wake slowly; storage is ephemeral and Free is not intended for production-critical workloads. There can be bandwidth/build overage or suspension. The app targets warm idle RSS below 200MB by using one uvicorn worker and no local LLM; this is a **design target**, not a proven memory ceiling until a real deployment load test.

A health monitor every five minutes may prevent idle spin-down but does not guarantee $0, availability or render provider consent. One always-warm instance uses about 720–744 hours in a 30/31-day month, nearly the entire shared budget.

## 1. Generate secret values locally

Generate two unrelated high-entropy values, NEVER put them in source control or this chat:

    python -c "import secrets; print(secrets.token_urlsafe(48))"

- **ASURA_ENGINE_SECRET:** copy the SAME random 32+ character string to Vercel and Render.
- **ASURA_DEFENSE_ACCESS_TOKEN:** a DIFFERENT 32+ character string stored only in Vercel; the operator enters it on the /defense page.
- **GROQ_API_KEY:** store on Render; the model must be accessible to this Groq account. The existing ASURA text model on Vercel is unaffected.

## 2. Connect the repository with Render Plugin or Blueprint

After the branch is merged:

1. Connect the Render plugin in ChatGPT and choose the intended workspace. Create a Docker web service from GitHub repository Niroop-H/ASURA, branch main. Alternatively, Render Dashboard → New → Blueprint → select the ASURA repo and its root render.yaml.
2. Confirm ONE service, name asura-defense-core, runtime docker, plan free, Dockerfile at ./backend/Dockerfile, context ./backend, health-check path /health. The Blueprint initially disables auto-deploy; review CI before manually deploying.
3. Configure Render environment variables: GROQ_API_KEY, ASURA_ENGINE_SECRET, GROQ_DEFENSE_MODEL=llama-3.3-70b-versatile. Leave SOC_TUNNEL_URL, SOC_TUNNEL_SECRET and ASURA_WEBHOOK_URL blank until individually configured.
4. Keep ASURA_ENABLE_CONTAINMENT=false and ASURA_ASSET_ALLOWLIST empty until a separately audited, authorized SOC bridge and exact scope are established.
5. Deploy and copy the **actual** Render origin, e.g. https://asura-defense-core.onrender.com. A bare https://onrender.com URL is not your deployed service.
6. If using the Render plugin's Create Web Service action rather than Blueprint, supply runtime docker, plan free, repo https://github.com/Niroop-H/ASURA, branch main, Dockerfile ./backend/Dockerfile, context ./backend, and auto-deploy no.

The plugin cannot create the other 50 SOC products merely from the registry. Many require separate VMs, storage, agents, licences, and authorized API access.

## 3. Vercel server environment

In Vercel → ASURA project → Settings → Environment Variables, configure:

| Variable | Required | Purpose |
|---|---|---|
| RENDER_BACKEND_URL | Yes | Actual https://YOUR-SERVICE.onrender.com origin |
| ASURA_ENGINE_SECRET | Yes | Same shared 32+ character secret as Render |
| ASURA_DEFENSE_ACCESS_TOKEN | Yes | Separate private operator access token |
| ASURA_AUDIT_WRITE_TOKEN | Optional | Protects legacy POST /api/audit |

Do not prefix any of these with NEXT_PUBLIC_. Redeploy Vercel after changing variables. The UI never calls Render directly. Only Vercel sees the operator token, validates it, and signs the request to Render.

Optional: set Render ASURA_WEBHOOK_URL to https://asura-topaz.vercel.app/api/defense/webhook to enable a secondary authenticated callback. Render-to-Vercel requests use the same HMAC request protocol. This does not create durable audit storage.

## 4. UptimeRobot

Create a monitor in UptimeRobot with:

- Monitor type: HTTP(s)
- URL: https://YOUR-SERVICE.onrender.com/health
- Interval: 5 minutes if available on the monitor plan
- Expected HTTP code: 200
- Expected JSON: {"status":"ok","engine":"ASURA-DEFENSE-CORE"}

The /health handler reads no keys, logs or external APIs and should be very fast for a warm process. Sub-5ms refers to handler processing, NOT cold-start or network latency. Track the 750-hour shared allowance and any bandwidth/build usage.

## 5. Verify locally

From repository root:

    npm ci
    npm run test:defense
    npm run test:blue-team
    npm run test:red-team
    npm run build
    python3.11 -m venv .venv
    . .venv/bin/activate
    python -m pip install -r backend/requirements.txt
    python -m unittest discover -s backend/tests -v

GitHub Actions runs the critical JavaScript/Python tests plus the Next.js build. These include HMAC request and replay checks, 50 registry definitions, tool status, refused action execution, signed SSE frames, one-time human approvals, in-process Merkle integrity and explicit missing-Groq behavior.

## 6. Verify the complete deployed request path

1. GET the public Render health endpoint and expect exact status/engine JSON:

       curl -fsS https://YOUR-SERVICE.onrender.com/health

2. Open https://asura-topaz.vercel.app/defense, enter the **Vercel operator token** (the field intentionally never saves to localStorage), and choose Check backend. Confirm 50 typed entries, risk level, tier and real status.
3. Choose a read-only prompt such as: "Inspect the Wazuh and MISP registry status; disclose which providers are not connected. Do not perform scans or block any asset."
4. Look for signed REASON → PLAN → ACT → OBSERVE → SYNTHESIZE stage summaries and a completion status. The browser shows action descriptions, model/tool name, latency, redacted evidence and Merkle roots, NOT private chain-of-thought.
5. Verify that a missing Groq key, account permission, upstream quota, or unavailable SOC tool returns a visible unavailable/incomplete state rather than fabricated success.
6. From a private terminal, set ASURA_DEFENSE_URL=https://asura-topaz.vercel.app, RENDER_BACKEND_URL to the real Render origin, and ASURA_DEFENSE_ACCESS_TOKEN to the operator secret. Run:

       node scripts/verify-defense-e2e.mjs

   The script checks Render health, authenticated Vercel-to-Render registry, signed SSE tool events and in-process ledger seals. It fails without a real Groq tool step, so mocked fixture success cannot be mistaken for provider validation.
7. Separately test HIGH approval with a documentation-only target (203.0.113.10) and choose Reject; expect REJECTED and no execution. Default approved proposals return APPROVED_NOT_EXECUTED because containment is disabled. Never activate real blocking in a development environment without verified scope and idempotent remote runbooks.

## HMAC contract

HMAC-SHA256 over METHOD, URL path, UNIX timestamp, 32-character random nonce and SHA256(raw request body), joined with newlines. Vercel signs requests, Render verifies in constant time with a 90-second clock skew window and best-effort in-memory nonce replay rejection. Render signs each SSE event body with HMAC-SHA256 over "sse\n" + body; Vercel verifies before displaying and auditing it. Render-to-Vercel webhooks use the same signed request protocol.

Replay caches are ephemeral, not durable/distributed. Human approval tokens are one-time and worker-bound. An interrupted stream or restart can cause incomplete status and lost pending approvals.

## Merkle audit limitations

ASURA's previously in-memory SHA-256 chain is now verifiable with a Merkle root over its retained event window. In Vercel, each signed event logs timestamp, event hash, stage and prompt hash; **raw prompts, keys and private model reasoning are not retained**. The ledger is NOT durable, immutable across process restarts, independently anchored or a FIPS-validated cryptographic product. A database/object store with external anchoring is needed for a production audit trail.

## Remaining integration gates

- 50 tools **registered** does not mean 50 **connected**. Tier 2 binaries are diagnostic-only. Tier 3 requires a separately deployed HTTPS SOC_TUNNEL_URL that implements the signed read-only and approved-response contracts, plus provider-specific versions/credentials. Some listed tools have no remote service API.
- Operational access control requires organization SSO, scoped roles, encrypted persistent approval state, distributed replay protection, per-provider permissions and independent SOC evidence.
- Autonomous blocking, quarantine, WAF changes and malware detonation are disabled by default. Approved actions require a properly authorized remote control plane with its own idempotency and security review.
- Groq usage, limits and model availability depend on the account; there is no guaranteed free token budget.
- Render Free is for development, not military/critical infrastructure operations.

References: https://render.com/docs/free ; https://render.com/docs/blueprint-spec ; https://console.groq.com/docs/tool-use/overview ; https://www.trivy.dev/docs/latest/getting-started/installation/
