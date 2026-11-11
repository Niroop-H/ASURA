import crypto from 'crypto';

/**
 * ASURA Defense Cryptographic Audit Logger
 * 
 * Provides an in-memory, tamper-evident audit ledger with SHA-256 hash chaining.
 * In-memory application events only; no compliance or integrity verification claim.
 */

let lastHash = '0000000000000000000000000000000000000000000000000000000000000000';

let auditLogs = [];

export function logAuditEvent({
  category = 'GENERAL_OP',
  action,
  actor = 'ANALYST_SESSION',
  classification = 'UNSPECIFIED',
  status = 'SUCCESS',
  details = '',
  ipAddress = '127.0.0.1',
}) {
  const timestamp = new Date().toISOString();
  const id = `AUD-${String(auditLogs.length + 1).padStart(3, '0')}`;
  
  // Calculate SHA-256 chained hash
  const rawData = `${lastHash}|${id}|${timestamp}|${category}|${action}|${actor}|${status}|${details}`;
  const hash = crypto.createHash('sha256').update(rawData).digest('hex');
  lastHash = hash;

  const event = {
    id,
    timestamp,
    category,
    action,
    actor,
    classification,
    status,
    details,
    ipAddress,
    hash,
  };

  auditLogs.unshift(event); // newest first
  if (auditLogs.length > 200) auditLogs.pop(); // keep last 200 events

  return event;
}

export function getAuditLogs(limit = 50) {
  return auditLogs.slice(0, limit);
}

export function verifyAuditChain() {
  // Verifies hash chain integrity
  return {
    valid: null,
    status: 'not_verified',
    persistent: false,
    totalRecords: auditLogs.length,
    headHash: lastHash,
    algorithm: 'SHA-256 chained hashes; verification not implemented',
  };
}
