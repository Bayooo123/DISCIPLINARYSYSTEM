const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const ROLES = {
  PLATFORM_ADMIN: 'platform_admin',
  COMMITTEE_MEMBER: 'committee_member',
  PANEL_MEMBER: 'panel_member',
  COMPLAINTS_OFFICER: 'complaints_officer',
  STUDENT: 'student',
};

/**
 * Verifies the JWT and attaches the decoded user to req.user.
 * Rejects requests with expired, tampered, or missing tokens.
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const token = authHeader.slice(7);
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  // Fetch fresh user record — catches deactivated accounts mid-session
  const { rows } = await query(
    'SELECT id, institution_id, email, full_name, role, is_active FROM users WHERE id = $1',
    [decoded.sub]
  );

  if (!rows.length || !rows[0].is_active) {
    return res.status(401).json({ error: 'Account not found or deactivated.' });
  }

  req.user = rows[0];
  next();
}

/**
 * Role guard — call after authenticate().
 * authorize('committee_member', 'platform_admin') permits either role.
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

/**
 * Ensures a user only accesses data belonging to their institution.
 * Attaches req.institutionId for downstream use.
 */
function scopeToInstitution(req, res, next) {
  if (req.user.role === ROLES.PLATFORM_ADMIN) {
    // Platform admins may pass an explicit institution_id query param,
    // or operate across all institutions.
    req.institutionId = req.query.institution_id || null;
  } else {
    req.institutionId = req.user.institution_id;
  }
  next();
}

module.exports = { authenticate, authorize, scopeToInstitution, ROLES };
