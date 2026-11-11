import { NextResponse } from 'next/server';

// NASA GIBS date metadata. A layer date is not a per-pixel capture timestamp.
export const runtime = 'nodejs';
const LAYER = 'VIIRS_NOAA20_CorrectedReflectance_TrueColor';
const ENDPOINT = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml';
export async function GET() {
  try {
    const response = await fetch(ENDPOINT, {
      next: { revalidate: 21600 },
      signal: AbortSignal.timeout(16000),
    });
    if (!response.ok) throw new Error('NASA GIBS catalog HTTP ' + response.status);
    const xml = await response.text();
    const index = xml.indexOf('<ows:Identifier>' + LAYER + '</ows:Identifier>');
    if (index === -1) throw new Error('Selected VIIRS layer not present in catalog');
    const start = xml.lastIndexOf('<Layer>', index), end = xml.indexOf('</Layer>', index);
    if (start === -1 || end === -1) throw new Error('Invalid NASA layer catalog format');
    const layer = xml.slice(start, end + 8);
    const time = layer.match(/<Dimension>[\s\S]*?<ows:Identifier>[Tt]ime<\/ows:Identifier>[\s\S]*?<\/Dimension>/)?.[0];
    const latest = time?.match(/<Default>(\d{4}-\d{2}-\d{2})<\/Default>/)?.[1];
    if (!latest || !/^\d{4}-\d{2}-\d{2}$/.test(latest) || Number.isNaN(Date.parse(latest))) {
      throw new Error('NASA layer availability date not supplied');
    }
    // A current-day layer can still have major unobserved areas. Select the previous day by default.
    const utcToday = new Date().toISOString().slice(0,10);
    const preferred = latest >= utcToday
      ? new Date(Date.parse(latest + 'T00:00:00Z') - 86400000).toISOString().slice(0,10)
      : latest;
    const out = NextResponse.json({
      success: true, provider: 'NASA Earthdata GIBS',
      layer: LAYER, satellite: 'NOAA-20 VIIRS',
      lastCatalogDate: latest, preferredDate: preferred,
      availableStart: '2018-01-05',
      resolution: '250 m class visible-light swath product',
      cadence: 'Daily; coverage and processing delays vary',
      note: 'The selected product day is NOT a guaranteed per-pixel capture time. Recent daily global coverage can contain gaps and clouds.',
      retrievedAt: new Date().toISOString(),
      attribution: 'NASA GIBS / NASA ESDIS',
    });
    out.headers.set('Cache-Control','public, s-maxage=21600, stale-while-revalidate=3600');
    return out;
  } catch (error) {
    return NextResponse.json({ success: false, provider: 'NASA Earthdata GIBS',
      error: 'Dated imagery catalog unavailable: ' + error.message,
      preferredDate: null }, {status:502});
  }
}
