const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { writeAuditLog, fromRequest } = require('../middleware/audit');

const router = express.Router();

// ── POST /auth/login ────────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const { rows } = await query(
    `SELECT u.id, u.institution_id, u.email, u.full_name, u.role,
            u.password_hash, u.is_active, i.name AS institution_name,
            i.short_name AS institution_short_name
     FROM users u
     LEFT JOIN institutions i ON i.id = u.institution_id
     WHERE LOWER(u.email) = LOWER($1)`,
    [email]
  );

  const user = rows[0];
  const passwordValid = user && await bcrypt.compare(password, user.password_hash);

  if (!user || !passwordValid || !user.is_active) {
    await writeAuditLog({
      action: 'user_login',
      metadata: { email, success: false, reason: !user ? 'not_found' : !passwordValid ? 'bad_password' : 'inactive' },
      ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
    });
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

  await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

  await writeAuditLog({
    institutionId: user.institution_id,
    actorId: user.id,
    actorRole: user.role,
    action: 'user_login',
    metadata: { success: true },
    ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
    userAgent: req.headers['user-agent'],
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      institutionId: user.institution_id,
      institutionName: user.institution_name,
    },
  });
});

// ── POST /auth/signup ────────────────────────────────────────────────────────

router.post('/signup', async (req, res) => {
  const { email, fullName, password } = req.body;
  if (!email || !fullName || !password) {
    return res.status(400).json({ error: 'Email, full name, and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  // Check against the email whitelist (set ALLOWED_EMAILS as a JSON env var)
  let whitelist = [];
  try { whitelist = JSON.parse(process.env.ALLOWED_EMAILS || '[]'); } catch {}
  const entry = whitelist.find(e => e.email.toLowerCase() === email.toLowerCase());
  if (!entry) {
    return res.status(403).json({ error: 'Your email is not authorised to register on this platform. Contact your administrator.' });
  }

  // Derive institution from email domain
  const domain = email.split('@')[1];
  const { rows: instRows } = await query(
    'SELECT id, name FROM institutions WHERE domain = $1 AND is_active = true',
    [domain]
  );
  const institution = instRows[0];
  if (!institution && entry.role !== 'platform_admin') {
    return res.status(400).json({ error: 'No active institution found for your email domain.' });
  }

  // Reject if already registered
  const { rows: existing } = await query(
    'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
    [email]
  );
  if (existing.length > 0) {
    return res.status(409).json({ error: 'An account with this email already exists. Please sign in instead.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const { rows } = await query(
    `INSERT INTO users (institution_id, email, password_hash, full_name, role, is_active)
     VALUES ($1, $2, $3, $4, $5, true)
     RETURNING id, institution_id, email, full_name, role`,
    [institution?.id || null, email, passwordHash, fullName, entry.role]
  );

  const user = rows[0];

  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

  await writeAuditLog({
    institutionId: user.institution_id,
    actorId: user.id,
    actorRole: user.role,
    action: 'user_created',
    targetId: user.id,
    targetType: 'user',
    metadata: { via: 'self_signup' },
    ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
  });

  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      institutionId: user.institution_id,
      institutionName: institution?.name || null,
    },
  });
});

// ── POST /auth/accept-invitation ────────────────────────────────────────────

router.post('/accept-invitation', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Token and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const { rows } = await query(
    `SELECT id, email, full_name, role, institution_id,
            invitation_expires_at, invitation_token
     FROM users
     WHERE invitation_token = $1`,
    [token]
  );

  const user = rows[0];
  if (!user) {
    return res.status(400).json({ error: 'Invalid invitation link.' });
  }
  if (new Date() > new Date(user.invitation_expires_at)) {
    return res.status(400).json({ error: 'This invitation link has expired. Please request a new one.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await query(
    `UPDATE users
     SET password_hash = $1, invitation_token = NULL, invitation_expires_at = NULL,
         is_active = true, updated_at = NOW()
     WHERE id = $2`,
    [passwordHash, user.id]
  );

  await writeAuditLog({
    institutionId: user.institution_id,
    actorId: user.id,
    actorRole: user.role,
    action: 'user_created',
    targetId: user.id,
    targetType: 'user',
    metadata: { via: 'invitation_acceptance' },
    ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
  });

  res.json({ message: 'Account activated. You may now log in.' });
});

// ── GET /auth/me ─────────────────────────────────────────────────────────────

router.get('/me', authenticate, (req, res) => {
  const { id, institution_id, email, full_name, role } = req.user;
  res.json({ id, institutionId: institution_id, email, fullName: full_name, role });
});

module.exports = router;
