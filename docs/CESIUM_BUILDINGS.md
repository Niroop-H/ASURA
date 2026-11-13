# Cesium 3D Buildings: ion 3D Tiles and no-token fallback

## Current issue

The screenshot on `asura.mahquantum.tech` showed: **"3D buildings: Configure CESIUM_ION_PUBLIC_TOKEN with read access to Cesium OSM Buildings."**

Previously, the `CesiumGlobe` component refused to load the 3D buildings layer unless `/api/cesium/config` returned a separate, configured public Cesium ion viewer token. Satellite imagery and the geometric WGS84 globe worked normally because those providers do not require the same ion asset entitlement.

The existing `CESIUM_ION_ACCESS_TOKEN` value is NOT copied into the browser. Its privileges are unknown. Do not try to bypass asset entitlements using another user’s credentials or a default account token.

## Preferred setup: Cesium OSM Buildings 3D Tiles

1. Open the [Cesium ion token settings](https://ion.cesium.com/tokens) in **your own** account.
2. Create a new **viewer-specific** token called something like `ASURA Public 3D Viewer`.
3. Give it only the public `assets:read` scope. Do not grant `assets:write`, `tokens:read`, `tokens:write`, `assets:list`, profile or administration permissions.
4. Allow access to **Cesium OSM Buildings, asset ID 96188**. If you also intend to use **Cesium World Terrain**, separately permit terrain asset **1**, subject to your account entitlements. Restrict access to those assets instead of all private uploads.
5. Add the URL restrictions used by your public viewer. Include `https://asura.mahquantum.tech` and `https://asura-topaz.vercel.app` if you use both; don't add localhost to a production token unless independently required.
6. In **Vercel → ASURA project → Settings → Environment Variables**, set `CESIUM_ION_PUBLIC_TOKEN` to the viewer token (not `CESIUM_ION_ACCESS_TOKEN`). Make sure it applies to the production environment. Redeploy so the server uses the updated value.
7. Open **/globe** or the Command Center's **Cesium 3D mode**, refresh, zoom into an urban block, select **Oblique 3D**, and click **3D buildings**.
8. If the icon is still missing, check `/api/cesium/config`: `tokenConfigured` should be true (this proves **presence only**, not permission). A 401/403 from Cesium typically indicates token/URL/asset entitlement; a 429 may indicate provider quota; a network failure may indicate a blocked request. Don't share the token publicly in a support message.

### Alternative when no ion token is configured

This release adds a **small, click-initiated OpenStreetMap footprint extrusion** option. When no ion token exists, the same **3D buildings** button:

- Requires camera altitude below approximately **10 km**. From a wide view, zoom further into a neighborhood first.
- Fetches only a bounded region approximately 200 m around the center, with up to **120 building footprints**.
- Uses OpenStreetMap building way outlines through the public Overpass API, with caching, tight query bounds, timeout and best-effort rate limiting.
- Extrudes valid footprints with OSM `height` when present, an **estimated** 3 m per `building:levels` otherwise, or an explicitly **illustrative** 9 m placeholder when neither is available.
- Reports measured vs. estimated vs. illustrative counts and displays OSM attribution.
- Preserves Cesium ion as the preferred higher-fidelity provider.

**The fallback is not the Cesium OSM Buildings 3D Tiles product.** It lacks roof detail/texture, building shapes may be incomplete, and mapped heights can be uncertain. Its date/source should never be interpreted as a current architectural survey.

The public Overpass API is a *community* service, not a guaranteed infrastructure backend for a high-traffic website. Its usage policy restricts large-scale repeated requests and may return 429, 504 or no results. The fallback is intended for small-scale research/demonstration; production usage should use a licensed hosting provider, an owned OSM data service, or the authorized Cesium ion tiles.

## Verification commands

After updating GitHub:

```bash
npm ci
npm run test:cesium
npm run build
```

After deployment, verify the public configuration (it exposes the *public* viewer token by design):

```
https://asura.mahquantum.tech/api/cesium/config
```

The config includes `ionEnabled` and `tokenPermissionsVerified:false`—because presence alone is not authorization. The presence of a valid token should result in the full 3D Tiles path; invalid access will be reported and the map can attempt the approximate OSM fallback at neighborhood zoom.

## Related defense engine

ASURA's Render FastAPI/Vercel/Groq Defense Core implementation is in `main` as commit `343468d1e8c5a70dfb02e8e9468e299fa20bde9e` and documented in [RENDER_DEFENSE_CORE.md](./RENDER_DEFENSE_CORE.md).

Deployment of Render and the required secrets is a separate step. Merkle audit is verifiable only **in process**, and all 50 Blue Team tool contracts are not independently connected. A third Free Render service could exhaust your workspace's **shared** Free compute allowance if multiple services are kept awake simultaneously.
