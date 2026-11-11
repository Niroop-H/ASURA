import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'not_assessed',
    overallScore: null,
    frameworks: [],
    controls: [],
    securityDeclarations: [],
    generatedAt: new Date().toISOString(),
    explanation: 'No independent assessment or verified control evidence is available. Previous sample scores and compliance declarations have been withdrawn.',
  });
}
