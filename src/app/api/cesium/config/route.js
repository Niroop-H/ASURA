import {NextResponse} from 'next/server';

// Browser tokens MUST be separately restricted to public read-only scopes and ASURA's origin.
// Never return the existing CESIUM_ION_ACCESS_TOKEN: its privilege level is unknown.
export const runtime = 'nodejs';
export async function GET(){
 const token = process.env.CESIUM_ION_PUBLIC_TOKEN || '';
 const configured = token.length > 24;
 const response = NextResponse.json({
   success:true,
   ionEnabled:configured,
   tokenConfigured:configured,
   tokenPermissionsVerified:false,
   publicViewerToken:configured ? token : null,
   terrain:configured ? 'Cesium World Terrain (requires asset entitlement)' : 'WGS84 ellipsoid',
   buildings:configured
    ? 'Cesium OSM Buildings 3D Tiles (requires asset 96188 permission)'
    : 'OpenStreetMap footprint extrusion fallback (experimental, bounded availability)',
   osmFootprintFallback:true,
   requiredBuildingAssetId:96188,
   warning:configured
    ? 'A viewer token is present, but permissions have NOT been verified. Use a read-only, URL-restricted token with access to Cesium OSM Buildings asset 96188.'
    : 'No dedicated public Cesium ion viewer token. Click 3D buildings at neighbourhood zoom to try approximate public OpenStreetMap footprints without a token.',
 });
 response.headers.set('Cache-Control','public, max-age=0, s-maxage=60, stale-while-revalidate=60');
 response.headers.set('X-Content-Type-Options','nosniff');
 return response;
}
