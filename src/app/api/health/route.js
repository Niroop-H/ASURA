import { NextResponse } from 'next/server';
import { evaluateKeys, getProblems } from '@/lib/keyHolder';
import { getAllSources } from '@/lib/sourceRegistry';

export async function GET() {
  try {
    const keys = evaluateKeys();
    const problems = getProblems();
    const sources = getAllSources();

    const total = keys.length;
    const configured = keys.filter((k) => k.present && k.valid).length;
    const requiredMissing = keys.filter(
      (k) => k.priority === 'required' && (!k.present || !k.valid)
    );
    const recommendedMissing = keys.filter(
      (k) => k.priority === 'recommended' && (!k.present || !k.valid)
    );

    let status = 'configuration_present';
    if (requiredMissing.length > 0) {
      status = 'critical';
    } else if (recommendedMissing.length > 0) {
      status = 'degraded';
    }

    return NextResponse.json({
      status,
      scope: 'credential_configuration_only',
      provider_connectivity: 'not_verified',
      observation_data: 'unavailable',
      timestamp: new Date().toISOString(),
      keys: {
        total,
        configured,
        required_missing: requiredMissing.length,
      },
      sources: {
        total: sources.length,
        enabled: sources.filter((s) => s.enabled).length,
      },
      problems,
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'critical', error: error.message },
      { status: 500 }
    );
  }
}
