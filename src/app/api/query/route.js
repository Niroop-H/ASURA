import { NextResponse } from 'next/server';
import { runIntelligenceQuery, streamIntelligenceQuery } from '@/lib/groqClient';
import { getAllSources } from '@/lib/sourceRegistry';
import { logAuditEvent } from '@/lib/auditLogger';

export async function POST(request) {
  try {
    const body = await request.json();
    const { query, stream = false } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query must be a non-empty string' },
        { status: 400 }
      );
    }

    const enabledSources = getAllSources().filter((s) => s.enabled);
    const startTime = Date.now();

    // Log query execution event for defense audit compliance (NIST SP 800-53 AU-2)
    logAuditEvent({
      category: 'INTEL_QUERY',
      action: 'EXECUTE_NATURAL_LANGUAGE_INQUIRY',
      actor: 'ANALYST_STATION_01',
      classification: 'CUI // REL TO NATO',
      status: 'INITIATED',
      details: `Prompt: "${query.substring(0, 80)}${query.length > 80 ? '...' : ''}" across ${enabledSources.length} sources`,
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    if (stream) {
      const readable = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            const chunks = streamIntelligenceQuery(query, {
              sources: enabledSources,
            });
            for await (const chunk of chunks) {
              const event = `data: ${JSON.stringify(chunk)}\n\n`;
              controller.enqueue(encoder.encode(event));
            }
            const doneEvent = `data: ${JSON.stringify({ done: true, duration_ms: Date.now() - startTime })}\n\n`;
            controller.enqueue(encoder.encode(doneEvent));
          } catch (error) {
            const errEvent = `data: ${JSON.stringify({ error: error.message })}\n\n`;
            controller.enqueue(encoder.encode(errEvent));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Non-streaming
    const result = await runIntelligenceQuery(query, {
      sources: enabledSources,
    });
    const durationMs = Date.now() - startTime;

    // Log completion
    logAuditEvent({
      category: 'INTEL_QUERY',
      action: 'INQUIRY_EVIDENCE_SYNTHESIS_COMPLETE',
      actor: 'AI_GATEWAY_GROQ',
      classification: 'CUI // REL TO NATO',
      status: result.success ? 'SUCCESS' : 'FAILED',
      details: result.success ? `Synthesis finished in ${(durationMs / 1000).toFixed(2)}s. Model: ${result.model || 'Groq LLaMA 3.3'}` : `Error: ${result.error}`,
    });

    return NextResponse.json({
      ...result,
      duration_ms: durationMs,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
