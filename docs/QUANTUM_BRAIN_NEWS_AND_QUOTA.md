# DEVASHRI — Quantum[-0-]Brain D25@1007

## Identity and actual inference

**Quantum[-0-]Brain D25@1007 is the ASURA application-facing AI identity.**
It is **not** a separately trained foundation model unless an independently trained
checkpoint and provenance are supplied in the future. Current text inference uses
Groq's `openai/gpt-oss-120b`; approved vision routes are documented in
[DEVASHRI_VISION.md](./DEVASHRI_VISION.md). The interface presents the ASURA
identity by default and offers technical provider/model disclosure on demand.

The underlying provider/model ID is retained in server result metadata and logs
for audit/debugging; product branding never changes the backend model, model
entitlements, intellectual-property ownership or provider usage limits.

## Fix for "latest NVIDIA news Jensen Huang" and unrelated general headlines

When NewsAPI is configured, a topical news request generates a bounded query
for [NewsAPI's Everything endpoint](https://newsapi.org/docs/endpoints/everything),
using language, title/description and publication-date sorting. Example:

- User: `Pass me the data of latest nvidia news jensen huang`
- NewsAPI `q`: `nvidia AND jensen AND huang`
- Endpoint: `/v2/everything` — no unrelated general headline substitution
- Authentication: `X-Api-Key` server-only HTTP header, never in the URL
- Provenance: article publisher, clickable URL, **published** time, **retrieved** time

The query is a keyword filter, not independent proof of article relevance,
authenticity, completeness, or 24/7 update frequency. NewsAPI plan-specific
delays and publisher corrections still apply.

**Direct publisher listing:** If the user requests a list or data of topical
headlines, DEVASHRI can return the retrieved articles directly (without
consuming a Groq model call). These are explicitly marked **source records, not
an AI-generated summary**. More analytical prompts still require model
inference or declared evidence-based degradation.

## Groq tokens-per-minute limit (HTTP 429)

A successful model listing is not a guarantee that the organization's minute
quota is available. The 8,000-TPM screenshot describes provider-side shared
organization capacity, not an application syntax or invalid-key error.

Controls implemented:

1. Shorter system instruction and relevant-source context, bounded recent
   history, smaller maximum completion reservations, and lower reasoning
   effort for longer evidence-heavy messages.
2. Avoid a hosted Groq browser search when a matching direct public publisher
   source already provides the requested evidence.
3. Parse `Retry-After` or supported retry indications on HTTP 429, apply a
   **per-instance** cooldown (not a distributed quota scheduler), and return
   `status:429`, `retryAfterSeconds`, and a clean explanation. No unsafe
   retry storms or provider organization identifiers in user-facing errors.
4. If the model is unavailable but records were retrieved, return them with
   explicit limitations. A failed required browser_search is **never**
   represented as verified web research.

Neither shorter prompts nor caching can override Groq's provider-enforced
organization-level TPM/RPD/RPM limits. If all tokens are exhausted, there may be
no AI response until capacity refreshes. No new paid provider, subscription,
or deployment configuration was changed.

## Verification

Run:

```bash
npm run test:news
npm run test:operational
npm run test:vision
npm run build
```

The news test suite verifies topical query formation, provider-key privacy,
unrelated headline prevention, direct source-only answers without model calls,
and the normalized model quota response. This is mocked contract testing:
real NewsAPI scope, permissions, live article quality and multi-user Groq quota
performance still require external monitoring.

No production deployment is part of this commit. All changes are intended for
the `main` branch after GitHub CI passes.
