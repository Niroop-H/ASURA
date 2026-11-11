# ASURA Architecture & System Design

## 1. System Overview
ASURA is a defense-grade multi-domain intelligence infrastructure designed for natural-language intelligence inquiries, bounded source acquisition, evidence normalization, and cross-source synthesis.

```
                    ┌────────────────────────┐
                    │      Authorized User   │
                    └───────────┬────────────┘
                                │ HTTPS
                                ▼
           ┌──────────────────────────────────────────────┐
           │        ASURA Unified Next.js Platform        │
           │           (Deployable on Vercel)             │
           ├──────────────────────┬───────────────────────┤
           │  Tactical Dashboard  │  Geospatial Radar     │
           │  (UI Components)     │  (Synthetic Observation)
           ├──────────────────────┴───────────────────────┤
           │          Serverless Edge API Routes          │
           │  /api/query  •  /api/sources  •  /api/keys   │
           └──────────────┬───────────────────────────────┘
                          │
         ┌────────────────┼────────────────┬────────────────┐
         ▼                ▼                ▼                ▼
┌─────────────────┐ ┌───────────┐ ┌────────────────┐ ┌───────────────┐
│   AI Gateway    │ │  Source   │ │ KeyHolder Svc  │ │  Observation  │
│  (Groq LLaMA)   │ │ Registry  │ │ (21 Providers) │ │ Feeds (Radar) │
└─────────────────┘ └───────────┘ └────────────────┘ └───────────────┘
```

## 2. Service Boundaries
1. **API Gateway & Routing**: Next.js App Router (`src/app/api/*`) with server-side validation and security headers.
2. **KeyHolder**: Server-side credential manager protecting 21 provider keys across 9 domains with strict zero-client exposure.
3. **AI Gateway**: Provider-independent model orchestrator with Groq LLaMA 3.3 70B versatile integration.
4. **Source Registry**: In-memory registry with dynamic enablement, categorization, and free-tier quota tracking.
5. **Geospatial & Radar Layer**: Tactical multi-domain tracking interface (aviation, maritime, seismic, CCTV feeds).

## 3. Vercel Deployment Architecture
- Built on Next.js 14 App Router.
- Fully serverless: zero persistent background worker locks.
- Static assets and frontend served globally via Vercel Edge CDN.
- API endpoints run in Vercel Serverless Functions.
