import { NextResponse } from 'next/server';
import { searchAirports } from '@/lib/airports';
export const runtime = 'nodejs';
export const maxDuration = 30;
export async function GET(request) {
  const p = new URL(request.url).searchParams;
  const q = (p.get('q') || '').slice(0, 90);
  const country = (p.get('country') || '').slice(0, 2);
  const offset = Math.max(0, Math.min(100000, parseInt(p.get('offset') || '0', 10) || 0));
  const limit = Math.max(1, Math.min(75, parseInt(p.get('limit') || '40', 10) || 40));
  try {
    const data = await searchAirports({q, country, offset, limit});
    const res = NextResponse.json({success:true,...data});
    res.headers.set('Cache-Control','public, s-maxage=600, stale-while-revalidate=120');
    return res;
  } catch (error) {
    return NextResponse.json({success:false,error:'Airport directory provider unavailable: ' + error.message,airports:[]},{status:502});
  }
}
