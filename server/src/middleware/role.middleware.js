export function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function requireSameInstitution(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (req.user.role === 'PLATFORM_ADMIN') return next();
  const paramId = req.params.institutionId;
  if (paramId && paramId !== req.user.institutionId) {
    return res.status(403).json({ error: 'Access denied to this institution' });
  }
  next();
}
