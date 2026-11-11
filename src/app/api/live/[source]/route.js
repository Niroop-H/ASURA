import { NextResponse } from 'next/server';
import { getLiveSource, LIVE_SOURCES } from '@/lib/liveFeeds';

export const runtime = 'nodejs';
export async function GET(request, { params }) {
  const source = params.source;
  if (!LIVE_SOURCES.includes(source))
    return NextResponse.json({ success: false, error: 'Unknown feed' }, { status: 404 });
  const result = await getLiveSource(source);
  const response = NextResponse.json(result, { status: result.success ? 200 : (result.status || 502) });
  response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}
