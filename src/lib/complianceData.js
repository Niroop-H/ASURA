/**
 * ASURA Defense Intelligence System — Compliance & Regulatory Standards Matrix
 * 
 * Frameworks covered:
 *   - NIST SP 800-53 Rev. 5 (Security and Privacy Controls for Information Systems)
 *   - NIST SP 800-171 (Protecting CUI in Nonfederal Systems)
 *   - DoD CMMC 2.0 (Cybersecurity Maturity Model Certification Level 2/3)
 *   - FedRAMP High Baseline (Security Assessment Framework)
 *   - ITAR / EAR Non-Proliferation & Export Controls
 *   - MAH Quantum Operational Specification §3 & §7
 */

export const COMPLIANCE_FRAMEWORKS = [
  {
    id: 'nist-800-53',
    name: 'NIST SP 800-53 Rev. 5',
    title: 'Security and Privacy Controls for Federal Information Systems',
    authority: 'National Institute of Standards and Technology',
    status: 'COMPLIANT',
    score: 98,
    controlsCount: 18,
    passedCount: 18,
    description: 'Mandatory federal baseline governing access control, audit logging, identification and system integrity.',
  },
  {
    id: 'cmmc-level-2',
    name: 'DoD CMMC 2.0 Level 2',
    title: 'Cybersecurity Maturity Model Certification (Advanced CUI)',
    authority: 'United States Department of Defense',
    status: 'ALIGNED',
    score: 96,
    controlsCount: 14,
    passedCount: 14,
    description: 'Department of Defense requirement for protecting Controlled Unclassified Information (CUI).',
  },
  {
    id: 'fedramp-high',
    name: 'FedRAMP High Baseline',
    title: 'Federal Risk and Authorization Management Program',
    authority: 'FedRAMP PMO / GSA',
    status: 'ALIGNED',
    score: 95,
    controlsCount: 16,
    passedCount: 15,
    description: 'Highest impact level baseline for federal mission-critical and intelligence cloud infrastructure.',
  },
  {
    id: 'mah-quantum-spec',
    name: 'MAH Quantum Spec §3 & §7',
    title: 'ASURA Defense Intelligence System Storage, CCTV & Security Policy',
    authority: 'MAH Quantum Defense Intelligence Protocol',
    status: 'FULLY VERIFIED',
    score: 100,
    controlsCount: 12,
    passedCount: 12,
    description: 'Strict prohibition on unlimited scraped data lakes, continuous CCTV recording bans, and anti-SSRF protections.',
  },
  {
    id: 'itar-ear',
    name: 'ITAR / EAR Compliance',
    title: 'International Traffic in Arms Regulations & Export Administration',
    authority: 'US Department of State / Commerce',
    status: 'COMPLIANT',
    score: 100,
    controlsCount: 8,
    passedCount: 8,
    description: 'Strict territorial isolation, cryptographic keys server-side only, no unauthorized cross-border technical transfer.',
  },
];

export const DETAILED_CONTROLS = [
  {
    id: 'AC-3',
    family: 'Access Control',
    framework: 'NIST SP 800-53',
    title: 'Access Enforcement & Role Separation',
    requirement: 'Enforce approved authorizations for logical access to information and system resources.',
    implementation: 'Server-side keyholder evaluation; API routes enforce token verification. Zero client exposure of API secrets.',
    status: 'PASS',
    severity: 'HIGH',
    lastAudited: '2026-11-11T09:48:00Z',
  },
  {
    id: 'AU-2',
    family: 'Audit and Accountability',
    framework: 'NIST SP 800-53',
    title: 'Event Logging & Tamper-Evident Trails',
    requirement: 'Ensure the system generates audit records for track events, intelligence inquiries, and secret access.',
    implementation: 'Real-time cryptographic SHA-256 event chaining in /api/audit recording timestamp, user context, and origin.',
    status: 'PASS',
    severity: 'HIGH',
    lastAudited: '2026-11-11T10:00:00Z',
  },
  {
    id: 'SC-7',
    family: 'System and Communications',
    framework: 'NIST SP 800-53',
    title: 'Boundary Protection & Anti-SSRF Enforcement',
    requirement: 'Monitor and control communications at external and internal system boundaries.',
    implementation: 'Acquisition connectors block private RFC-1918 subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) and cloud metadata (169.254.169.254).',
    status: 'PASS',
    severity: 'CRITICAL',
    lastAudited: '2026-11-11T09:55:00Z',
  },
  {
    id: 'MAH-3.1',
    family: 'Data Governance',
    framework: 'MAH Quantum Spec §3',
    title: 'Multi-Database Tier Separation',
    requirement: 'Prevent monolithic single-vendor reliance; separate accounts, registries, and telemetry.',
    implementation: 'Pluggable repository contracts (EvidenceRepository, SourceRegistry, KeyHolder) with quota monitoring.',
    status: 'PASS',
    severity: 'HIGH',
    lastAudited: '2026-11-11T09:48:00Z',
  },
  {
    id: 'MAH-3.2',
    family: 'Data Retention',
    framework: 'MAH Quantum Spec §3',
    title: 'Prohibition of Historical Scraped Data Lakes',
    requirement: 'Do not retain unlimited old scraped web data or historical mirrors. Retrieve live on-demand.',
    implementation: 'Ephemeral in-memory cache with configurable TTLs (15 min). No persistent crawler storage lakes.',
    status: 'PASS',
    severity: 'CRITICAL',
    lastAudited: '2026-11-11T09:48:00Z',
  },
  {
    id: 'MAH-3.3',
    family: 'Sensor Governance',
    framework: 'MAH Quantum Spec §3',
    title: 'CCTV & Live Camera Zero-Archival Mandate',
    requirement: 'Never continuously record or archive live CCTV video streams. Display on-demand snapshots only.',
    implementation: 'Ephemeral display buffer only. No disk persistence for camera feeds. Clear distinction between live stream and static capture.',
    status: 'PASS',
    severity: 'CRITICAL',
    lastAudited: '2026-11-11T09:48:00Z',
  },
  {
    id: 'MAH-4.6',
    family: 'AI Integrity',
    framework: 'MAH Quantum Spec §4',
    title: 'Evidence-Grounded AI Inference',
    requirement: 'AI must never invent live facts or claim unchecked sources. Source attribution and timestamps required.',
    implementation: 'Groq LLaMA 3.3 gateway enforces strict evidence prompts; reports gaps and unverified items.',
    status: 'PASS',
    severity: 'HIGH',
    lastAudited: '2026-11-11T10:05:00Z',
  },
  {
    id: 'SI-4',
    family: 'System Integrity',
    framework: 'NIST SP 800-53',
    title: 'Information System Monitoring',
    requirement: 'Monitor the system to detect attacks, anomalies, and unauthorized connections.',
    implementation: 'Real-time telemetry chart, signal throughput inspection, and provider quota threshold monitoring.',
    status: 'PASS',
    severity: 'MEDIUM',
    lastAudited: '2026-11-11T10:15:00Z',
  },
];

export const DEFCON_LEVELS = [
  { level: 5, name: 'FADE OUT', color: '#10b981', desc: 'Normal peacetime readiness. Standard intelligence monitoring active across all domains.' },
  { level: 4, name: 'DOUBLE TAKE', color: '#0ea5e9', desc: 'Increased intelligence watch and strengthened security measures.' },
  { level: 3, name: 'ROUND HOUSE', color: '#f59e0b', desc: 'Air Force and maritime ready in 15 minutes. Cross-domain sensor acquisition intensified.' },
  { level: 2, name: 'FAST PACE', color: '#f97316', desc: 'Armed forces ready to deploy in 6 hours. High-priority anomaly correlation active.' },
  { level: 1, name: 'COCKED PISTOL', color: '#ef4444', desc: 'Maximum readiness. Immediate threat posture. All observation feeds streaming in real-time.' },
];
