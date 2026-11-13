import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
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
  // Prevent unauthenticated visitors from injecting fabricated audit entries.
  // Defence bridge writes directly through the server-only logger.
  const expected=process.env.ASURA_AUDIT_WRITE_TOKEN||'';
  const supplied=request.headers.get('x-asura-audit-write-token')||'';
  if(Buffer.byteLength(expected)<32||Buffer.byteLength(supplied)!==Buffer.byteLength(expected)||
    !crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(supplied))){
    return NextResponse.json({success:false,error:'Audit writes require server authorization'},{status:403});
  }
  try {
    const body = await request.json();
    const event = logAuditEvent(body);
    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
