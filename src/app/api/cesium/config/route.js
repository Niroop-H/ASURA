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
   publicViewerToken:configured ? token : null,
   terrain:configured ? 'Cesium World Terrain (access-dependent)' : 'WGS84 ellipsoid',
   buildings:configured ? 'Optional Cesium OSM Buildings (access-dependent)' : 'Not configured',
   warning: configured
    ? 'Use only domain-restricted read-only Cesium ion viewer tokens in this public endpoint.'
    : 'No dedicated public Cesium ion viewer token configured; 3D globe operates without elevated terrain or 3D building tiles.',
 });
 response.headers.set('Cache-Control','public, s-maxage=3600, stale-while-revalidate=300');
 response.headers.set('X-Content-Type-Options','nosniff');
 return response;
}
