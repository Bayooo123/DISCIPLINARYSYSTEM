/**
 * Complaint filing routes — Stage 01 of the disciplinary workflow.
 * Only complaints officers may file complaints.
 */

const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { authenticate, authorize, scopeToInstitution, ROLES } = require('../middleware/auth');
const { writeAuditLog, fromRequest } = require('../middleware/audit');
const workflow = require('../services/workflow');

const router = express.Router();

// Memory storage — no disk writes, works in serverless (Vercel filesystem is read-only).
// Files arrive as req.files[n].buffer; wire up S3 here when ready.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf',
      'video/mp4', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    cb(null, allowed.includes(file.mimetype));
  },
});

// ── GET /complaints/lookup/:matricNumber ─────────────────────────────────────
// SIS lookup — auto-populates student data from matric number.
// Officers call this before filing to verify the student exists.

router.get(
  '/lookup/:matricNumber',
  authenticate,
  authorize(ROLES.COMPLAINTS_OFFICER, ROLES.COMMITTEE_MEMBER, ROLES.PLATFORM_ADMIN),
  scopeToInstitution,
  async (req, res) => {
    const { matricNumber } = req.params;
    const { rows } = await query(
      `SELECT s.id, s.matric_number, s.level, s.programme,
              u.full_name, u.email,
              f.name AS faculty_name
       FROM students s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN faculties f ON f.id = s.faculty_id
       WHERE s.institution_id = $1
         AND UPPER(s.matric_number) = UPPER($2)
         AND u.is_active = true`,
      [req.institutionId, matricNumber]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'No active student found with that matriculation number.' });
    }

    // Return only what the officer needs — not sensitive internal fields
    const s = rows[0];
    res.json({
      studentId: s.id,
      matricNumber: s.matric_number,
      fullName: s.full_name,
      email: s.email,
      faculty: s.faculty_name,
      level: s.level,
      programme: s.programme,
    });
  }
);

// ── POST /complaints ──────────────────────────────────────────────────────────
// File a new complaint — Stage 01.

router.post(
  '/',
  authenticate,
  authorize(ROLES.COMPLAINTS_OFFICER, ROLES.PLATFORM_ADMIN),
  scopeToInstitution,
  upload.array('evidence', 10),
  async (req, res) => {
    const {
      studentId,
      offenceCategoryId,
      offenceDescription,
      regulationBreached,
      incidentDate,
      incidentLocation,
    } = req.body;

    if (!studentId || !offenceDescription) {
      return res.status(400).json({ error: 'Student ID and offence description are required.' });
    }

    // Verify the student belongs to this institution
    const { rows: studentRows } = await query(
      'SELECT id FROM students WHERE id = $1 AND institution_id = $2',
      [studentId, req.institutionId]
    );
    if (!studentRows.length) {
      return res.status(404).json({ error: 'Student not found within this institution.' });
    }

    // Verify the officer's jurisdiction (faculty officers may only file for their faculty)
    const { rows: assignmentRows } = await query(
      `SELECT oa.jurisdiction, oa.faculty_id, oa.hostel_id, s.faculty_id AS student_faculty_id
       FROM officer_assignments oa
       JOIN students s ON s.id = $1
       WHERE oa.user_id = $2`,
      [studentId, req.user.id]
    );

    if (assignmentRows.length) {
      const assignment = assignmentRows[0];
      if (
        assignment.jurisdiction === 'faculty' &&
        assignment.faculty_id !== assignment.student_faculty_id
      ) {
        return res.status(403).json({
          error: 'You may only file complaints against students within your assigned faculty.',
        });
      }
    }

    // Generate case reference
    const { rows: [{ name: institutionName, short_name: shortName }] } = await query(
      'SELECT name, short_name FROM institutions WHERE id = $1',
      [req.institutionId]
    );

    const { rows: [refRow] } = await query(
      'SELECT next_case_reference($1, $2) AS reference',
      [req.institutionId, shortName]
    );

    // Create the case
    const { rows: [newCase] } = await query(
      `INSERT INTO cases
         (reference, institution_id, student_id, filed_by, offence_category_id,
          offence_description, regulation_breached, incident_date, incident_location,
          current_stage)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'complaint_filed')
       RETURNING id, reference, filed_at`,
      [
        refRow.reference,
        req.institutionId,
        studentId,
        req.user.id,
        offenceCategoryId || null,
        offenceDescription,
        regulationBreached || null,
        incidentDate || null,
        incidentLocation || null,
      ]
    );

    // Persist uploaded evidence files
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await query(
          `INSERT INTO evidence_files
             (case_id, uploaded_by, file_name, file_size, mime_type, storage_key)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            newCase.id,
            req.user.id,
            file.originalname,
            file.size,
            file.mimetype,
            file.originalname,
          ]
        );

        await writeAuditLog({
          ...fromRequest(req),
          action: 'evidence_uploaded',
          caseId: newCase.id,
          metadata: { fileName: file.originalname, fileSize: file.size },
        });
      }
    }

    await writeAuditLog({
      ...fromRequest(req),
      action: 'complaint_filed',
      caseId: newCase.id,
      targetId: studentId,
      targetType: 'student',
      metadata: { reference: newCase.reference, offenceDescription },
    });

    // Advance workflow: trigger student notification (Stage 02)
    await workflow.onComplaintFiled({
      caseId: newCase.id,
      actorId: req.user.id,
      actorRole: req.user.role,
      institutionId: req.institutionId,
    });

    res.status(201).json({
      caseId: newCase.id,
      reference: newCase.reference,
      filedAt: newCase.filed_at,
      message: 'Complaint filed successfully. The student has been notified.',
    });
  }
);

// ── GET /complaints/mine ──────────────────────────────────────────────────────
// Officer sees only their own complaints.

router.get(
  '/mine',
  authenticate,
  authorize(ROLES.COMPLAINTS_OFFICER, ROLES.PLATFORM_ADMIN),
  scopeToInstitution,
  async (req, res) => {
    const { rows } = await query(
      `SELECT c.id, c.reference, c.current_stage, c.outcome, c.filed_at,
              u.full_name AS student_name, s.matric_number,
              f.name AS faculty_name
       FROM cases c
       JOIN students s ON s.id = c.student_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN faculties f ON f.id = s.faculty_id
       WHERE c.filed_by = $1
       ORDER BY c.filed_at DESC`,
      [req.user.id]
    );

    res.json(rows);
  }
);

module.exports = router;
