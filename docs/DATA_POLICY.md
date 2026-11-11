# ASURA Data Retention & Privacy Policy

In accordance with MAH Quantum Product Decisions (ASURA Spec §3):

## 1. No Historical Scraped Data Lake
- ASURA retrieves current information on demand.
- Historical scraped web pages, bulky documents, and crawl caches are **not** archived indefinitely.
- Short-lived caching uses configurable TTLs (default 15 minutes) to avoid redundant requests.

## 2. CCTV & Camera Media Protocol
- Live camera snapshots or authorized streams are fetched on demand only for active user sessions.
- Continuous recording, stream archiving, or persistent disk storage of camera footage is strictly prohibited.
- Snapshots are displayed with explicit observation timestamps and clearly distinguished from live video feeds.

## 3. Free-Tier Database Isolation
- Multiple free-tier database services are utilized according to data responsibility:
  - Account & role data: Free-tier relational or document database.
  - Source Registry: Lightweight persistent store.
  - Ephemeral cache: Redis / Upstash with TTL.
- Quota alerts trigger graceful degradation rather than silent data loss.

## 4. Future Dedicated Database Integration Channel
- Storage interfaces (`EvidenceRepository`, `EntityRepository`, `SourceRegistry`) abstract all storage operations.
- Application code does not bind directly to vendor-specific SDKs, allowing zero-friction migration to a dedicated historical database in future phases.
