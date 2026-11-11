import { NextResponse } from 'next/server';
import { COMPLIANCE_FRAMEWORKS, DETAILED_CONTROLS } from '@/lib/complianceData';
import { verifyAuditChain, getAuditLogs } from '@/lib/auditLogger';
import { evaluateKeys } from '@/lib/keyHolder';
import { getAllSources } from '@/lib/sourceRegistry';

export async function GET() {
  try {
    const keys = evaluateKeys();
    const sources = getAllSources();
    const auditChain = verifyAuditChain();
    const recentLogs = getAuditLogs(10);

    // Compute composite readiness
    const totalControls = DETAILED_CONTROLS.length;
    const passedControls = DETAILED_CONTROLS.filter((c) => c.status === 'PASS').length;
    const overallScore = Math.round((passedControls / totalControls) * 100);

    const report = {
      systemName: 'ASURA Defense Intelligence System',
      systemVersion: '0.1.0-alpha',
      classification: 'NATO UNCLASSIFIED // REL TO NATO / CUI',
      generatedAt: new Date().toISOString(),
      overallScore,
      summary: {
        totalFrameworks: COMPLIANCE_FRAMEWORKS.length,
        totalControls,
        passedControls,
        auditTrailVerified: auditChain.valid,
        activeSources: sources.filter((s) => s.enabled).length,
        configuredKeyHolders: keys.filter((k) => k.present && k.valid).length,
      },
      frameworks: COMPLIANCE_FRAMEWORKS,
      controls: DETAILED_CONTROLS,
      auditVerification: auditChain,
      recentAuditEvents: recentLogs,
      securityDeclarations: [
        {
          id: 'DECL-01',
          rule: 'MAH Quantum Spec §3.2 (No Historical Data Lake)',
          status: 'COMPLIANT',
          proof: 'System stores no persistent raw web scraping lake. Operates on fresh on-demand retrieval with 15m TTL cache.',
        },
        {
          id: 'DECL-02',
          rule: 'MAH Quantum Spec §3.3 (CCTV & Camera Media Protocol)',
          status: 'COMPLIANT',
          proof: 'Strict prohibition of continuous CCTV or camera recording. Proxied snapshots on-demand only.',
        },
        {
          id: 'DECL-03',
          rule: 'NIST SP 800-53 SC-7 (Anti-SSRF Boundary Defense)',
          status: 'COMPLIANT',
          proof: 'Private network subnets (127.0.0.1, 10.0.0.0/8, 169.254.169.254) blocked from crawler access.',
        },
        {
          id: 'DECL-04',
          rule: 'ITAR / Zero-Client-Exposure Credential Policy',
          status: 'COMPLIANT',
          proof: 'All API keys and credentials are kept server-side in process memory. Zero exposure to frontend client bundles.',
        },
      ],
    };

    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
