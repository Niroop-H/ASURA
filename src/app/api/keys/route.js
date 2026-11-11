import { NextResponse } from 'next/server';
import { evaluateKeys, getProblems } from '@/lib/keyHolder';

export async function GET() {
  try {
    const keys = evaluateKeys();
    const problems = getProblems();

    const total = keys.length;
    const configured = keys.filter((k) => k.present && k.valid).length;
    const missingRequired = keys.filter(
      (k) => k.priority === 'required' && (!k.present || !k.valid)
    ).length;
    const missingRecommended = keys.filter(
      (k) => k.priority === 'recommended' && (!k.present || !k.valid)
    ).length;

    // Strip actual key values — expose only status booleans
    const safeKeys = keys.map(({ envVar, provider, domain, priority, present, valid, freeTier, docsUrl, error }) => ({
      envVar,
      provider,
      domain,
      priority,
      present,
      valid,
      freeTier,
      docsUrl,
      ...(error ? { error } : {}),
    }));

    return NextResponse.json({
      keys: safeKeys,
      problems,
      summary: {
        total,
        configured,
        missing_required: missingRequired,
        missing_recommended: missingRecommended,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
