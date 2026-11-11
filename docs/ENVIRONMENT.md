# ASURA Environment Variables Reference

Configure these variables in your `.env.local` (local) or Vercel Environment Variables dashboard (production).

## Required for Core Operations
- `GROQ_API_KEY`: Groq API key for LLaMA 3.3 70B analytical inference.
- `JWT_SECRET`: Random 32+ character secret for secure token and session validation.

## Recommended Observation Feeds
- `NEWSAPI_KEY`: NewsAPI.org key for current global news headlines.
- `GOOGLE_SEARCH_API_KEY`: Google Custom Search API key.
- `GOOGLE_SEARCH_ENGINE_ID`: Google Custom Search Engine (CX) ID.
- `OPENWEATHERMAP_API_KEY`: Weather & air quality metrics.
- `AVIATIONSTACK_API_KEY`: Aviation and aircraft telemetry feed.
- `CESIUM_ION_ACCESS_TOKEN`: Cesium Ion access token for 3D globe visualization.

## Optional Database & Cache
- `DATABASE_URL`: PostgreSQL / Supabase connection URL.
- `MONGODB_URI`: MongoDB Atlas free cluster connection URI.
- `REDIS_URL`: Upstash Redis URI for query response caching.
