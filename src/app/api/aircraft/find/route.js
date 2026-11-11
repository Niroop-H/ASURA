import { NextResponse } from 'next/server';
import { findLiveAircraft } from '@/lib/liveFeeds';
export const runtime = 'nodejs';
export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const result = await findLiveAircraft(params.get('mode'), params.get('q'));
  const response = NextResponse.json(result, { status: result.success ? 200 : result.status || 502 });
  response.headers.set('Cache-Control', 'public, s-maxage=45, stale-while-revalidate=15');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}
