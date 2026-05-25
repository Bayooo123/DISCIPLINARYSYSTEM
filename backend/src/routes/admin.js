/**
 * Admin routes — platform admin and institution-level administration.
 * User invitations, institution setup, analytics.
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { authenticate, authorize, scopeToInstitution, ROLES } = require('../middleware/auth');
const { writeAuditLog, fromRequest } = require('../middleware/audit');
const { dispatch, templates } = require('../services/notifications');

const router = express.Router();

// ── POST /admin/institutions — Create a new institution (platform admin only) ─

router.post(
  '/institutions',
  authenticate,
  authorize(ROLES.PLATFORM_ADMIN),
  async (req, res) => {
    const { name, shortName, domain, brandColour } = req.body;
    if (!name || !shortName || !domain) {
      return res.status(400).json({ error: 'name, shortName, and domain are required.' });
    }

    const { rows: [inst] } = await query(
      `INSERT INTO institutions (name, short_name, domain, brand_colour)
       VALUES ($1,$2,$3,$4)
       RETURNING id, name, short_name, domain`,
      [name, shortName, domain, brandColour || '#003366']
    );

    await writeAuditLog({
      ...fromRequest(req),
      action: 'institution_created',
      targetId: inst.id,
      targetType: 'institution',
      metadata: { name, shortName, domain },
    });

    res.status(201).json(inst);
  }
);

// ── POST /admin/users/invite — Invite a committee/panel/officer user ──────────

router.post(
  '/users/invite',
  authenticate,
  authorize(ROLES.PLATFORM_ADMIN, ROLES.COMMITTEE_MEMBER),
  scopeToInstitution,
  async (req, res) => {
    const { email, fullName, role, phone } = req.body;

    const allowedRoles = [
      ROLES.COMMITTEE_MEMBER, ROLES.PANEL_MEMBER, ROLES.COMPLAINTS_OFFICER,
    ];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${allowedRoles.join(', ')}` });
    }
    if (!email || !fullName) {
      return res.status(400).json({ error: 'email and fullName are required.' });
    }

    // Check for duplicate
    const { rows: existing } = await query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND institution_id = $2',
      [email, req.institutionId]
    );
    if (existing.length) {
      return res.status(409).json({ error: 'A user with this email already exists in this institution.' });
    }

    const invitationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    // Placeholder password hash — replaced when invitation is accepted
    const placeholderHash = await bcrypt.hash(uuidv4(), 10);

    const { rows: [newUser] } = await query(
      `INSERT INTO users
         (institution_id, email, full_name, phone, role, password_hash,
          is_active, invited_at, invitation_token, invitation_expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,false,NOW(),$7,$8)
       RETURNING id`,
      [req.institutionId, email.toLowerCase(), fullName, phone || null,
       role, placeholderHash, invitationToken, expiresAt]
    );

    // Fetch institution details for the email
    const { rows: [inst] } = await query(
      'SELECT name FROM institutions WHERE id = $1',
      [req.institutionId]
    );

    const inviteUrl = `${process.env.FRONTEND_URL}/accept-invitation?token=${invitationToken}`;
    const roleLabel = role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    await dispatch({
      caseId: null,
      recipientId: newUser.id,
      recipientEmail: email,
      recipientPhone: phone || null,
      templateName: 'user_invitation',
      subject: `Invitation to the ${inst.name} Digital Disciplinary Platform`,
      body: `
        <p>Dear ${fullName},</p>
        <p>In light of your appointment as <strong>${roleLabel}</strong> on the
        ${inst.name} Disciplinary System, you are hereby invited to register on the platform.</p>
        <p>Kindly click the link below to complete your registration.
        This link is personal to you and will expire in 72 hours.</p>
        <p><a href="${inviteUrl}" style="background:#003366;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;">
          Accept Invitation & Register
        </a></p>`,
      smsBody: null,
      institutionId: req.institutionId,
      actorId: req.user.id,
      actorRole: req.user.role,
    });

    await writeAuditLog({
      ...fromRequest(req),
      action: 'user_invited',
      targetId: newUser.id,
      targetType: 'user',
      metadata: { email, role, fullName },
    });

    res.status(201).json({ userId: newUser.id, message: 'Invitation sent.' });
  }
);

// ── POST /admin/students — Bulk-create students from SIS data ─────────────────

router.post(
  '/students',
  authenticate,
  authorize(ROLES.PLATFORM_ADMIN),
  scopeToInstitution,
  async (req, res) => {
    const { students } = req.body;
    // students: [{ matricNumber, fullName, email, phone, facultyCode, level, programme }]

    if (!Array.isArray(students) || !students.length) {
      return res.status(400).json({ error: 'students array is required.' });
    }

    const created = [];
    const failed = [];

    for (const s of students) {
      try {
        // Resolve faculty
        let facultyId = null;
        if (s.facultyCode) {
          const { rows: [fac] } = await query(
            'SELECT id FROM faculties WHERE institution_id = $1 AND UPPER(code) = UPPER($2)',
            [req.institutionId, s.facultyCode]
          );
          facultyId = fac?.id || null;
        }

        const placeholderHash = await bcrypt.hash(uuidv4(), 10);

        const { rows: [user] } = await query(
          `INSERT INTO users (institution_id, email, full_name, phone, role, password_hash, is_active)
           VALUES ($1,$2,$3,$4,'student',$5,true)
           ON CONFLICT (institution_id, email) DO UPDATE SET full_name = EXCLUDED.full_name
           RETURNING id`,
          [req.institutionId, s.email.toLowerCase(), s.fullName, s.phone || null, placeholderHash]
        );

        await query(
          `INSERT INTO students (user_id, institution_id, matric_number, faculty_id, level, programme)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (institution_id, matric_number) DO NOTHING`,
          [user.id, req.institutionId, s.matricNumber, facultyId, s.level || null, s.programme || null]
        );

        created.push(s.matricNumber);
      } catch (err) {
        failed.push({ matricNumber: s.matricNumber, error: err.message });
      }
    }

    res.json({ created: created.length, failed });
  }
);

// ── GET /admin/analytics — Institution-level case analytics ──────────────────

router.get(
  '/analytics',
  authenticate,
  authorize(ROLES.COMMITTEE_MEMBER, ROLES.PANEL_MEMBER, ROLES.PLATFORM_ADMIN),
  scopeToInstitution,
  async (req, res) => {
    const iid = req.institutionId;

    const [summary, byStage, byFaculty, resolutionTime] = await Promise.all([
      // Total cases
      query(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE current_stage != 'closed') AS active,
                COUNT(*) FILTER (WHERE current_stage = 'closed') AS closed,
                COUNT(*) FILTER (WHERE outcome = 'upheld') AS upheld,
                COUNT(*) FILTER (WHERE outcome = 'dismissed') AS dismissed
         FROM cases WHERE institution_id = $1`,
        [iid]
      ),
      // Cases by stage
      query(
        `SELECT current_stage AS stage, COUNT(*) AS count
         FROM cases WHERE institution_id = $1
         GROUP BY current_stage ORDER BY count DESC`,
        [iid]
      ),
      // Cases by faculty
      query(
        `SELECT f.name AS faculty, COUNT(c.id) AS count
         FROM cases c
         JOIN students s ON s.id = c.student_id
         LEFT JOIN faculties f ON f.id = s.faculty_id
         WHERE c.institution_id = $1
         GROUP BY f.name ORDER BY count DESC`,
        [iid]
      ),
      // Average resolution time in days for closed cases
      query(
        `SELECT ROUND(AVG(EXTRACT(EPOCH FROM (closed_at - filed_at)) / 86400), 1) AS avg_days
         FROM cases WHERE institution_id = $1 AND closed_at IS NOT NULL`,
        [iid]
      ),
    ]);

    res.json({
      summary: summary.rows[0],
      byStage: byStage.rows,
      byFaculty: byFaculty.rows,
      avgResolutionDays: resolutionTime.rows[0]?.avg_days || null,
    });
  }
);

// ── GET /admin/users — List institution users ─────────────────────────────────

router.get(
  '/users',
  authenticate,
  authorize(ROLES.COMMITTEE_MEMBER, ROLES.PLATFORM_ADMIN),
  scopeToInstitution,
  async (req, res) => {
    const { rows } = await query(
      `SELECT id, email, full_name, role, is_active, created_at, last_login_at
       FROM users
       WHERE institution_id = $1 AND role != 'student'
       ORDER BY role, full_name`,
      [req.institutionId]
    );
    res.json(rows);
  }
);

module.exports = router;
