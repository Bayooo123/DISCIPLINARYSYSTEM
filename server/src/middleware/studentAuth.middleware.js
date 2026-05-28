import jwt from 'jsonwebtoken';

export function requireStudentAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Student authentication required' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'STUDENT') {
      return res.status(403).json({ error: 'Access denied' });
    }
    req.student = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session. Please use the link from your email.' });
  }
}
