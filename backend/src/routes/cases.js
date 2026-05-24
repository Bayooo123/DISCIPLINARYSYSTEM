/**
 * Case management routes — committee/panel operations and student portal access.
 * Covers Stages 03–07 of the disciplinary workflow.
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const { query } = require('../config/db');
const { authenticate, authorize, scopeToInstitution, ROLES } = require('../middleware/auth');
const { writeAuditLog, fromRequest } = require('../middleware/audit');
const workflow = require('../services/workflow');

const router = express.Router();

const upload = multer({
  dest: path.join(__dirname, '../../uploads/evidence'),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// ── GET /cases — Committee: all cases for institution ────────────────────────

router.get(
  '/',
  authenticate,
  authorize(ROLES.COMMITTEE_MEMBER, ROLES.PANEL_MEMBER, ROLES.PLATFORM_ADMIN),
  scopeToInstitution,
  async (req, res) => {
    const { stage, outcome } = req.query;

    let whereClause = 'WHERE c.institution_id = $1';
    const params = [req.institutionId];

    if (stage) {
      params.push(stage);
      whereClause += ` AND c.current_stage = $${params.length}`;
    }
    if (outcome) {
      params.push(outcome);
      whereClause += ` AND c.outcome = $${params.length}`;
    }

    const { rows } = await query(
      `SELECT c.id, c.reference, c.current_stage, c.outcome, c.filed_at,
              c.response_deadline, c.closed_at,
              u.full_name AS student_name, s.matric_number,
              f.name AS faculty_name,
              officer.full_name AS filed_by_name,
              p.id AS panel_id
       FROM cases c
       JOIN students s ON s.id = c.student_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN faculties f ON f.id = s.faculty_id
       JOIN users officer ON officer.id = c.filed_by
       LEFT JOIN panels p ON p.case_id = c.id
       ${whereClause}
       ORDER BY c.filed_at DESC`,
      params
    );

    res.json(rows);
  }
);

// ── GET /cases/:id — Full case file ─────────────────────────────────────────

router.get(
  '/:id',
  authenticate,
  scopeToInstitution,
  async (req, res) => {
    const { id } = req.params;

    const { rows: [c] } = await query(
      `SELECT c.*, u.full_name AS student_name, s.matric_number, s.level,
              s.programme, f.name AS faculty_name,
              officer.full_name AS filed_by_name,
              officer.email AS filed_by_email
       FROM cases c
       JOIN students s ON s.id = c.student_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN faculties f ON f.id = s.faculty_id
       JOIN users officer ON officer.id = c.filed_by
       WHERE c.id = $1`,
      [id]
    );

    if (!c) return res.status(404).json({ error: 'Case not found.' });

    // Students may only view their own case
    if (req.user.role === ROLES.STUDENT) {
      const { rows: [student] } = await query(
        'SELECT id FROM students WHERE user_id = $1',
        [req.user.id]
      );
      if (!student || c.student_id !== student.id) {
        return res.status(403).json({ error: 'Access denied.' });
      }
    } else {
      // All institution users must belong to the same institution
      if (req.user.role !== ROLES.PLATFORM_ADMIN && c.institution_id !== req.institutionId) {
        return res.status(403).json({ error: 'Access denied.' });
      }
    }

    // Fetch associated records
    const [evidence, response, panel, hearing, verdict] = await Promise.all([
      query('SELECT id, file_name, file_size, mime_type, uploaded_at FROM evidence_files WHERE case_id = $1', [id]),
      query('SELECT plea, response_text, submitted_at FROM student_responses WHERE case_id = $1', [id]),
      query(`SELECT p.id, p.constituted_at,
                    json_agg(json_build_object(
                      'userId', pm.user_id,
                      'name', u.full_name,
                      'panelRole', pm.panel_role
                    )) AS members
             FROM panels p
             JOIN panel_members pm ON pm.panel_id = p.id
             JOIN users u ON u.id = pm.user_id
             WHERE p.case_id = $1
             GROUP BY p.id`, [id]),
      query('SELECT id, scheduled_at, venue, student_attended, hearing_notes, completed_at FROM hearings WHERE case_id = $1', [id]),
      query('SELECT outcome, penalty, effective_date, conditions, appeal_rights, recorded_at, communicated_at FROM verdicts WHERE case_id = $1', [id]),
    ]);

    res.json({
      ...c,
      evidence: evidence.rows,
      studentResponse: response.rows[0] || null,
      panel: panel.rows[0] || null,
      hearing: hearing.rows[0] || null,
      verdict: verdict.rows[0] || null,
    });
  }
);

// ── POST /cases/:id/response — Stage 03: Student submits response ─────────────

router.post(
  '/:id/response',
  authenticate,
  authorize(ROLES.STUDENT),
  upload.array('evidence', 5),
  async (req, res) => {
    const { id } = req.params;
    const { plea, responseText } = req.body;

    if (!plea || !['admit', 'deny'].includes(plea)) {
      return res.status(400).json({ error: 'plea must be "admit" or "deny".' });
    }
    if (!responseText || responseText.trim().length < 10) {
      return res.status(400).json({ error: 'A written response of at least 10 characters is required.' });
    }

    // Verify case belongs to this student and is still awaiting response
    const { rows: [student] } = await query(
      'SELECT id FROM students WHERE user_id = $1',
      [req.user.id]
    );
    const { rows: [c] } = await query(
      `SELECT id, current_stage, response_deadline, institution_id
       FROM cases WHERE id = $1 AND student_id = $2`,
      [id, student?.id]
    );

    if (!c) return res.status(404).json({ error: 'Case not found.' });
    if (!['awaiting_response', 'student_notified'].includes(c.current_stage)) {
      return res.status(400).json({ error: 'A response has already been submitted for this case.' });
    }
    if (new Date() > new Date(c.response_deadline)) {
      return res.status(400).json({ error: 'The response deadline has passed.' });
    }

    // Prevent duplicate responses
    const { rows: existing } = await query(
      'SELECT id FROM student_responses WHERE case_id = $1',
      [id]
    );
    if (existing.length) {
      return res.status(400).json({ error: 'A response has already been recorded for this case.' });
    }

    await query(
      `INSERT INTO student_responses (case_id, plea, response_text)
       VALUES ($1, $2, $3)`,
      [id, plea, responseText.trim()]
    );

    // Upload any accompanying evidence
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await query(
          `INSERT INTO evidence_files
             (case_id, uploaded_by, file_name, file_size, mime_type, storage_key)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [id, req.user.id, file.originalname, file.size, file.mimetype, file.filename]
        );

        await writeAuditLog({
          ...fromRequest(req),
          institutionId: c.institution_id,
          action: 'evidence_uploaded',
          caseId: id,
          metadata: { uploadedBy: 'student', fileName: file.originalname },
        });
      }
    }

    await workflow.onStudentResponseSubmitted({
      caseId: id,
      actorId: req.user.id,
      actorRole: req.user.role,
      institutionId: c.institution_id,
    });

    res.json({ message: 'Response submitted successfully.' });
  }
);

// ── POST /cases/:id/panel — Stage 04: Constitute a panel ─────────────────────

router.post(
  '/:id/panel',
  authenticate,
  authorize(ROLES.COMMITTEE_MEMBER, ROLES.PLATFORM_ADMIN),
  scopeToInstitution,
  async (req, res) => {
    const { id } = req.params;
    const { members } = req.body;
    // members: [{ userId, panelRole: 'chairperson'|'secretary'|'member' }]

    if (!members || !Array.isArray(members) || members.length < 2) {
      return res.status(400).json({ error: 'A panel requires at least a chairperson and a secretary.' });
    }

    const hasChair = members.some(m => m.panelRole === 'chairperson');
    const hasSecretary = members.some(m => m.panelRole === 'secretary');
    if (!hasChair || !hasSecretary) {
      return res.status(400).json({ error: 'Panel must include a chairperson and a secretary.' });
    }

    const { rows: [c] } = await query(
      `SELECT id, current_stage, institution_id FROM cases
       WHERE id = $1 AND institution_id = $2`,
      [id, req.institutionId]
    );

    if (!c) return res.status(404).json({ error: 'Case not found.' });

    const eligibleStages = ['response_received', 'response_overdue'];
    if (!eligibleStages.includes(c.current_stage)) {
      return res.status(400).json({
        error: `Cannot constitute a panel for a case in stage: ${c.current_stage}`,
      });
    }

    // Check no panel exists yet
    const { rows: existingPanel } = await query(
      'SELECT id FROM panels WHERE case_id = $1',
      [id]
    );
    if (existingPanel.length) {
      return res.status(400).json({ error: 'A panel has already been constituted for this case.' });
    }

    // Create panel
    const { rows: [panel] } = await query(
      `INSERT INTO panels (case_id, institution_id, constituted_by)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [id, req.institutionId, req.user.id]
    );

    // Fetch member details for notifications
    const memberDetails = [];
    for (const m of members) {
      const { rows: [user] } = await query(
        'SELECT id, full_name, email FROM users WHERE id = $1 AND institution_id = $2',
        [m.userId, req.institutionId]
      );
      if (!user) continue;

      await query(
        `INSERT INTO panel_members (panel_id, user_id, panel_role)
         VALUES ($1, $2, $3)`,
        [panel.id, m.userId, m.panelRole]
      );

      memberDetails.push({ ...user, panel_role: m.panelRole });
    }

    await workflow.onPanelConstituted({
      caseId: id,
      panelId: panel.id,
      members: memberDetails,
      actorId: req.user.id,
      actorRole: req.user.role,
      institutionId: req.institutionId,
    });

    res.status(201).json({ panelId: panel.id, message: 'Panel constituted. Members have been notified.' });
  }
);

// ── POST /cases/:id/hearings — Stage 05: Schedule a hearing ──────────────────

router.post(
  '/:id/hearings',
  authenticate,
  authorize(ROLES.COMMITTEE_MEMBER, ROLES.PANEL_MEMBER, ROLES.PLATFORM_ADMIN),
  scopeToInstitution,
  async (req, res) => {
    const { id } = req.params;
    const { scheduledAt, venue } = req.body;

    if (!scheduledAt || !venue) {
      return res.status(400).json({ error: 'scheduledAt and venue are required.' });
    }

    const { rows: [c] } = await query(
      `SELECT c.id, c.current_stage, c.institution_id, p.id AS panel_id
       FROM cases c
       JOIN panels p ON p.case_id = c.id
       WHERE c.id = $1 AND c.institution_id = $2`,
      [id, req.institutionId]
    );

    if (!c) return res.status(404).json({ error: 'Case or panel not found.' });

    const { rows: [hearing] } = await query(
      `INSERT INTO hearings (panel_id, case_id, scheduled_at, venue)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [c.panel_id, id, scheduledAt, venue]
    );

    await query(
      `UPDATE cases SET current_stage = 'hearing_scheduled', updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    await workflow.onAppearanceNoticeSent({
      caseId: id,
      hearingId: hearing.id,
      actorId: req.user.id,
      actorRole: req.user.role,
      institutionId: req.institutionId,
    });

    res.status(201).json({ hearingId: hearing.id, message: 'Hearing scheduled. Appearance notice sent to student.' });
  }
);

// ── PATCH /cases/:id/hearings/:hearingId — Stage 06: Record hearing ──────────

router.patch(
  '/:id/hearings/:hearingId',
  authenticate,
  authorize(ROLES.COMMITTEE_MEMBER, ROLES.PANEL_MEMBER, ROLES.PLATFORM_ADMIN),
  scopeToInstitution,
  async (req, res) => {
    const { id, hearingId } = req.params;
    const { studentAttended, hearingNotes } = req.body;

    await query(
      `UPDATE hearings
       SET student_attended = $1, hearing_notes = $2,
           completed_at = NOW(), recorded_by = $3
       WHERE id = $4 AND case_id = $5`,
      [studentAttended, hearingNotes, req.user.id, hearingId, id]
    );

    await query(
      `UPDATE cases SET current_stage = 'hearing_completed', updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    await writeAuditLog({
      ...fromRequest(req),
      action: 'hearing_record_saved',
      caseId: id,
      targetId: hearingId,
      targetType: 'hearing',
      metadata: { studentAttended },
    });

    res.json({ message: 'Hearing record saved.' });
  }
);

// ── POST /cases/:id/verdict — Stage 07: Record and communicate verdict ────────

router.post(
  '/:id/verdict',
  authenticate,
  authorize(ROLES.COMMITTEE_MEMBER, ROLES.PANEL_MEMBER, ROLES.PLATFORM_ADMIN),
  scopeToInstitution,
  async (req, res) => {
    const { id } = req.params;
    const { outcome, penalty, effectiveDate, conditions, appealRights, ratifiedByUserId } = req.body;

    if (!outcome || !['upheld', 'dismissed', 'referred'].includes(outcome)) {
      return res.status(400).json({ error: 'outcome must be "upheld", "dismissed", or "referred".' });
    }

    const { rows: [c] } = await query(
      `SELECT c.id, c.institution_id, p.id AS panel_id
       FROM cases c
       JOIN panels p ON p.case_id = c.id
       WHERE c.id = $1 AND c.institution_id = $2
         AND c.current_stage = 'hearing_completed'`,
      [id, req.institutionId]
    );

    if (!c) return res.status(404).json({ error: 'Case not found or not yet at hearing_completed stage.' });

    const { rows: [verdict] } = await query(
      `INSERT INTO verdicts
         (case_id, panel_id, outcome, penalty, effective_date, conditions,
          appeal_rights, ratified_by, recorded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [
        id, c.panel_id, outcome, penalty || null,
        effectiveDate || null, conditions || null,
        appealRights || null,
        ratifiedByUserId || req.user.id,
        req.user.id,
      ]
    );

    await workflow.onVerdictRecorded({
      caseId: id,
      verdictId: verdict.id,
      actorId: req.user.id,
      actorRole: req.user.role,
      institutionId: req.institutionId,
    });

    res.status(201).json({ verdictId: verdict.id, message: 'Verdict recorded and communicated to student.' });
  }
);

// ── GET /cases/:id/audit — Audit trail for a case ────────────────────────────

router.get(
  '/:id/audit',
  authenticate,
  authorize(ROLES.COMMITTEE_MEMBER, ROLES.PLATFORM_ADMIN),
  scopeToInstitution,
  async (req, res) => {
    const { rows } = await query(
      `SELECT al.id, al.action, al.metadata, al.ip_address, al.created_at,
              u.full_name AS actor_name, al.actor_role
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_id
       WHERE al.case_id = $1
       ORDER BY al.created_at ASC`,
      [req.params.id]
    );

    res.json(rows);
  }
);

module.exports = router;
