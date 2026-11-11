import { NextResponse } from 'next/server';

export async function POST(request) {
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 }); }
  if (typeof body?.query !== 'string' || !body.query.trim()) {
    return NextResponse.json({ success: false, error: 'Query must be a non-empty string' }, { status: 400 });
  }
  // Fail closed for both streaming and ordinary requests: registry metadata is not evidence.
  return NextResponse.json({
    success: false,
    status: 'unavailable',
    error: 'Evidence acquisition is not implemented. No sources were retrieved and no model request was sent.',
    answer: null,
    records: [],
    sources_accessed: [],
  }, { status: 503 });
}
