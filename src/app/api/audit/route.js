import { NextResponse } from 'next/server';
import { getAuditLogs, logAuditEvent, verifyAuditChain } from '@/lib/auditLogger';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const logs = getAuditLogs(limit);
    const verification = verifyAuditChain();

    return NextResponse.json({
      success: true,
      logs,
      verification,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const event = logAuditEvent(body);
    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
