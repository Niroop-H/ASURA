import { NextResponse } from 'next/server';
import { getLiveSource, LIVE_SOURCES } from '@/lib/liveFeeds';

export const runtime = 'nodejs';
const isCoordinate = (value, min, max) => {
  if (value === null || !/^-?\d{1,3}(?:\.\d{1,4})?$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
};
export async function GET(request, { params }) {
  const source = params.source;
  if (!LIVE_SOURCES.includes(source)) {
    return NextResponse.json({ success: false, error: 'Unknown feed' }, { status: 404 });
  }
  const query = new URL(request.url).searchParams;
  const region = query.get('region') || 'bengaluru';
  const latParam = query.get('lat'), lonParam = query.get('lon');
  let lat = null, lon = null;
  if (latParam !== null || lonParam !== null) {
    lat = isCoordinate(latParam, -90, 90);
    lon = isCoordinate(lonParam, -180, 180);
    if (lat === null || lon === null || !['flights', 'flightaware'].includes(source)) {
      return NextResponse.json({ success: false, error: 'Invalid geographic coordinates or unsupported source' }, { status: 400 });
    }
  }
  const result = await getLiveSource(source, { region, lat, lon });
  const response = NextResponse.json(result, { status: result.success ? 200 : (result.status || 502) });
  response.headers.set('Cache-Control', source === 'flights'
    ? 'public, s-maxage=35, stale-while-revalidate=15'
    : 'public, s-maxage=60, stale-while-revalidate=30');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}
