# ASURA Red Team workspace — 50 repository references

## Status and scope

The **Red Team** page is at \`/red-team\`. It provides a searchable, eight-category inventory of the 50 GitHub security repositories supplied for this project.

**All 50 are reference entries only.** They are **not** installed, checked out, enabled, executed, integrated with a C2 service, or approved to operate. The fact that an upstream repository exists or has had a recent push does not mean its software works in ASURA or is secure to install.

This release deliberately does not provide an unattended attack orchestrator, arbitrary shell execution, external target scanning, credential harvesting, phishing operations, vulnerability exploitation, adversary pivoting or evasive payload execution. Those capabilities would require separate, carefully scoped authorized lab tooling, an operator approval flow, sandbox isolation, per-tool review and safety controls.

## Page features

- **50 reference entries across 8 lifecycle categories.** Exact supplied GitHub project paths, concise purposes, source links, numbered entries and explicit \`NOT INSTALLED\` status.
- **Interactive search and category filters.** No invented tools are substituted if a search has no results.
- **Command workspace** with strictly allowlisted, read-only operations:
  - \`inventory\`: counts category entries and reports integration state;
  - \`search\`: searches the static catalogue;
  - \`assessment-plan\`: prepares a permission-first checklist for a named lab (no assertion that permission was verified);
  - \`verify-reference\`: requests public GitHub repository metadata for **one** entry from the allowlist. It cannot take a user-chosen URL.
- GitHub metadata verification returns \`archived\`, \`pushedAt\`, optional licence metadata, and **always** reports \`installed:false\` and \`executable:false\`. Provider-side redirects, errors, throttling or invalid responses fail visibly.
- External project references are ordinary GitHub links; the site does not fetch scripts, installers or artifacts from the repositories.

## API contract

\`GET /api/red-team\` returns the catalogue summary, safety constraints and supported read-only actions.

\`POST /api/red-team\` accepts JSON; for example:

\`\`\`json
{"action":"inventory"}
\`\`\`

\`\`\`json
{"action":"search","query":"secret","category":"recon"}
\`\`\`

\`\`\`json
{"action":"assessment-plan","scope":"Company-owned training laboratory"}
\`\`\`

\`\`\`json
{"action":"verify-reference","repository":"gitleaks/gitleaks"}
\`\`\`

The API rejects any other action, including any request to run downloaded software or arbitrary shell commands, with HTTP 400. GitHub metadata requests are bounded by timeouts, a hard-coded provider endpoint, a single allowlisted repository, and best-effort per-instance rate limiting. A production application open to external users still needs independent authentication, shared rate limiting, observability and authorization before exposing security-sensitive operations.

## Future separate authorization work

A genuine laboratory automation deployment would require:
1. A signed written scope and named asset owner.
2. A separately operated isolated lab and allowlisted target environment.
3. Reviewed per-tool licences, security posture, supply-chain checks and updates.
4. Human approval of each active test plan, explicit permissible actions and stop conditions.
5. Safe collection/redaction of logs and repeatable defensive evidence.
6. Independent security review and access controls, rather than website-access-based authorization.

This release does **not** claim to meet those requirements or run offensive software.

## Verification

Run \`npm run test:red-team\` and \`npm run build\`. GitHub Actions executes both. Tests cover 50 unique entries, category counts, search, permission-first planning, rejection of arbitrary execution, GitHub endpoint allowlisting and metadata validation.

Repository locations were supplied by the user; they have not all been individually confirmed to be the current maintained upstream paths. The metadata check can inspect one at a time but is not proof of tool operational readiness.
