const { query } = require('../config/db');

/**
 * Writes a record to audit_logs.
 * Called explicitly from route handlers — not as passive middleware —
 * so each write carries meaningful, action-specific metadata.
 *
 * This function is the single write path. It must be called on every
 * state-changing action, including failures where the failure itself
 * is auditable (e.g. failed login attempts, rejected submissions).
 */
async function writeAuditLog({
  institutionId = null,
  actorId = null,
  actorRole = null,
  action,
  caseId = null,
  targetId = null,
  targetType = null,
  metadata = {},
  ipAddress = null,
  userAgent = null,
}) {
  await query(
    `INSERT INTO audit_logs
       (institution_id, actor_id, actor_role, action, case_id,
        target_id, target_type, metadata, ip_address, user_agent)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      institutionId,
      actorId,
      actorRole,
      action,
      caseId,
      targetId,
      targetType,
      JSON.stringify(metadata),
      ipAddress,
      userAgent,
    ]
  );
}

/**
 * Pulls the real IP from common proxy headers, falling back to socket address.
 */
function getIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    null
  );
}

/**
 * Convenience: builds the standard audit payload from a request object.
 * Merge with action-specific fields before passing to writeAuditLog.
 */
function fromRequest(req) {
  return {
    institutionId: req.institutionId || req.user?.institution_id || null,
    actorId: req.user?.id || null,
    actorRole: req.user?.role || null,
    ipAddress: getIp(req),
    userAgent: req.headers['user-agent'] || null,
  };
}

module.exports = { writeAuditLog, fromRequest };
