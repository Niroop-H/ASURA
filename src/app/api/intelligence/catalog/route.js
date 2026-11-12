import {NextResponse} from 'next/server';
import {capabilitySummary} from '@/lib/intelligenceCatalog';
import {CONTEXT_SOURCES} from '@/lib/agentContext';
export const runtime='nodejs';
export async function GET(){
 const sectors=capabilitySummary();
 return NextResponse.json({
  success:true,product:'ASURA Defense Intelligence System™',
  developer:'MAH Quantum',status:'research-development',
  checkedAt:new Date().toISOString(),
  scope:'Public, read-only and properly licensed sources; coverage is not worldwide or continuous.',
  sectorCount:sectors.length,chatSourceIds:CONTEXT_SOURCES,sectors,
  caveat:'Direct means implemented read-only adapter, not live uptime confirmation. Research-only sources require a successful, provider-permitted web lookup. Neither authorizes restricted feeds.',
 },{headers:{'Cache-Control':'public, s-maxage=300, stale-while-revalidate=60'}});
}
