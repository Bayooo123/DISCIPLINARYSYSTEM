/**
 * Workflow engine — advances case stages and triggers the associated
 * notifications and audit log entries for each transition.
 *
 * Each function represents a stage gate: it updates the case record,
 * writes to the audit log, and dispatches notifications.
 */

const { query } = require('../config/db');
const { writeAuditLog } = require('../middleware/audit');
const { dispatch, templates } = require('./notifications');

// ── Helpers ──────────────────────────────────────────────────────────────────

function addWorkingDays(date, days) {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

async function getInstitution(institutionId) {
  const { rows } = await query(
    'SELECT id, name, short_name FROM institutions WHERE id = $1',
    [institutionId]
  );
  return rows[0];
}

async function getStudentUser(studentId) {
  const { rows } = await query(
    `SELECT u.id, u.email, u.full_name, s.phone, s.matric_number
     FROM students s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = $1`,
    [studentId]
  );
  return rows[0];
}

// ── Stage 01→02: Complaint filed → Student notified ──────────────────────────

async function onComplaintFiled({ caseId, actorId, actorRole, institutionId }) {
  const { rows: [c] } = await query(
    `SELECT c.id, c.reference, c.student_id, c.offence_description,
            c.regulation_breached, c.incident_date,
            u.full_name AS officer_name, oa.jurisdiction
     FROM cases c
     JOIN users u ON u.id = c.filed_by
     LEFT JOIN officer_assignments oa ON oa.user_id = c.filed_by
     WHERE c.id = $1`,
    [caseId]
  );

  const institution = await getInstitution(institutionId);
  const student = await getStudentUser(c.student_id);
  const responseDeadline = addWorkingDays(new Date(), 3);
  const portalUrl = `${process.env.FRONTEND_URL}/portal/cases/${caseId}`;

  // Set the response deadline on the case
  await query(
    `UPDATE cases
     SET current_stage = 'awaiting_response', response_deadline = $1, updated_at = NOW()
     WHERE id = $2`,
    [responseDeadline, caseId]
  );

  const tmpl = templates.complaintNotice({
    institutionName: institution.name,
    studentName: student.full_name,
    caseRef: c.reference,
    officerName: c.officer_name,
    officerDesignation: c.jurisdiction ? `${c.jurisdiction} Officer` : 'Complaints Officer',
    offenceDescription: c.offence_description,
    regulationBreached: c.regulation_breached,
    incidentDate: c.incident_date ? new Date(c.incident_date).toLocaleDateString('en-GB') : null,
    portalUrl,
    responseDeadline: responseDeadline.toLocaleDateString('en-GB', { dateStyle: 'long' }),
  });

  await dispatch({
    caseId,
    recipientId: student.id,
    recipientEmail: student.email,
    recipientPhone: student.phone,
    templateName: 'complaint_notice',
    subject: tmpl.subject,
    body: tmpl.html,
    smsBody: tmpl.sms,
    institutionId,
    actorId,
    actorRole,
  });

  await writeAuditLog({
    institutionId,
    actorId,
    actorRole,
    action: 'student_notified',
    caseId,
    targetId: student.id,
    targetType: 'user',
    metadata: { responseDeadline },
  });
}

// ── Stage 03: Student response submitted ─────────────────────────────────────

async function onStudentResponseSubmitted({ caseId, actorId, actorRole, institutionId }) {
  await query(
    `UPDATE cases
     SET current_stage = 'response_received', updated_at = NOW()
     WHERE id = $1`,
    [caseId]
  );

  await writeAuditLog({
    institutionId,
    actorId,
    actorRole,
    action: 'student_response_submitted',
    caseId,
    targetType: 'student_response',
    metadata: {},
  });
}

// ── Stage 03 → escalation: Response deadline missed ──────────────────────────

async function onResponseDeadlineMissed({ caseId, institutionId }) {
  await query(
    `UPDATE cases
     SET current_stage = 'response_overdue', updated_at = NOW()
     WHERE id = $1 AND current_stage = 'awaiting_response'`,
    [caseId]
  );

  await writeAuditLog({
    institutionId,
    action: 'response_deadline_missed',
    caseId,
    metadata: { escalatedAt: new Date() },
  });
}

// ── Stage 04: Panel constituted ───────────────────────────────────────────────

async function onPanelConstituted({ caseId, panelId, members, actorId, actorRole, institutionId }) {
  const { rows: [c] } = await query('SELECT reference FROM cases WHERE id = $1', [caseId]);
  const institution = await getInstitution(institutionId);

  await query(
    `UPDATE cases
     SET current_stage = 'panel_constituted', updated_at = NOW()
     WHERE id = $1`,
    [caseId]
  );

  // Notify each panel member
  for (const member of members) {
    const tmpl = templates.panelInvitation({
      institutionName: institution.name,
      memberName: member.full_name,
      caseRef: c.reference,
      panelRole: member.panel_role,
    });

    await dispatch({
      caseId,
      recipientId: member.id,
      recipientEmail: member.email,
      recipientPhone: null,
      templateName: 'panel_invitation',
      subject: tmpl.subject,
      body: tmpl.html,
      smsBody: null,
      institutionId,
      actorId,
      actorRole,
    });

    await writeAuditLog({
      institutionId,
      actorId,
      actorRole,
      action: 'panel_member_assigned',
      caseId,
      targetId: member.id,
      targetType: 'user',
      metadata: { panelId, panelRole: member.panel_role },
    });
  }

  await writeAuditLog({
    institutionId,
    actorId,
    actorRole,
    action: 'panel_constituted',
    caseId,
    targetId: panelId,
    targetType: 'panel',
    metadata: { memberCount: members.length },
  });
}

// ── Stage 05: Appearance notice dispatched ───────────────────────────────────

async function onAppearanceNoticeSent({ caseId, hearingId, actorId, actorRole, institutionId }) {
  const { rows: [h] } = await query(
    `SELECT h.scheduled_at, h.venue, c.student_id, c.reference, c.offence_description
     FROM hearings h
     JOIN cases c ON c.id = h.case_id
     WHERE h.id = $1`,
    [hearingId]
  );

  const institution = await getInstitution(institutionId);
  const student = await getStudentUser(h.student_id);
  const hearingDate = new Date(h.scheduled_at);
  const portalUrl = `${process.env.FRONTEND_URL}/portal/cases/${caseId}`;

  await query(
    `UPDATE cases
     SET current_stage = 'appearance_noticed', updated_at = NOW()
     WHERE id = $1`,
    [caseId]
  );

  const tmpl = templates.appearanceNotice({
    institutionName: institution.name,
    studentName: student.full_name,
    caseRef: h.reference,
    hearingDate: hearingDate.toLocaleDateString('en-GB', { dateStyle: 'long' }),
    hearingTime: hearingDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    venue: h.venue,
    charges: h.offence_description,
    penaltyRange: 'Penalties may include a formal warning, suspension, rustication, or expulsion, depending on the severity of the finding.',
    portalUrl,
  });

  await dispatch({
    caseId,
    recipientId: student.id,
    recipientEmail: student.email,
    recipientPhone: student.phone,
    templateName: 'appearance_notice',
    subject: tmpl.subject,
    body: tmpl.html,
    smsBody: tmpl.sms,
    institutionId,
    actorId,
    actorRole,
  });

  await writeAuditLog({
    institutionId,
    actorId,
    actorRole,
    action: 'appearance_notice_sent',
    caseId,
    targetId: hearingId,
    targetType: 'hearing',
    metadata: { scheduledAt: h.scheduled_at, venue: h.venue },
  });
}

// ── Stage 07: Verdict recorded and communicated ──────────────────────────────

async function onVerdictRecorded({ caseId, verdictId, actorId, actorRole, institutionId }) {
  const { rows: [v] } = await query(
    `SELECT v.outcome, v.penalty, v.effective_date, v.conditions, v.appeal_rights,
            c.reference, c.student_id
     FROM verdicts v
     JOIN cases c ON c.id = v.case_id
     WHERE v.id = $1`,
    [verdictId]
  );

  const institution = await getInstitution(institutionId);
  const student = await getStudentUser(v.student_id);
  const portalUrl = `${process.env.FRONTEND_URL}/portal/cases/${caseId}`;

  await query(
    `UPDATE cases
     SET current_stage = 'verdict_recorded', outcome = $1, updated_at = NOW()
     WHERE id = $2`,
    [v.outcome, caseId]
  );

  const tmpl = templates.verdictLetter({
    institutionName: institution.name,
    studentName: student.full_name,
    caseRef: v.reference,
    outcome: v.outcome,
    penalty: v.penalty,
    effectiveDate: v.effective_date ? new Date(v.effective_date).toLocaleDateString('en-GB') : null,
    conditions: v.conditions,
    appealRights: v.appeal_rights,
    portalUrl,
  });

  await dispatch({
    caseId,
    recipientId: student.id,
    recipientEmail: student.email,
    recipientPhone: student.phone,
    templateName: 'verdict_letter',
    subject: tmpl.subject,
    body: tmpl.html,
    smsBody: tmpl.sms,
    institutionId,
    actorId,
    actorRole,
  });

  await query(
    `UPDATE verdicts SET communicated_at = NOW() WHERE id = $1`,
    [verdictId]
  );

  await query(
    `UPDATE cases SET current_stage = 'closed', closed_at = NOW() WHERE id = $1`,
    [caseId]
  );

  await writeAuditLog({
    institutionId,
    actorId,
    actorRole,
    action: 'verdict_recorded',
    caseId,
    targetId: verdictId,
    targetType: 'verdict',
    metadata: { outcome: v.outcome, penalty: v.penalty },
  });

  await writeAuditLog({
    institutionId,
    actorId,
    actorRole,
    action: 'case_closed',
    caseId,
    metadata: { outcome: v.outcome },
  });
}

module.exports = {
  onComplaintFiled,
  onStudentResponseSubmitted,
  onResponseDeadlineMissed,
  onPanelConstituted,
  onAppearanceNoticeSent,
  onVerdictRecorded,
  addWorkingDays,
};
