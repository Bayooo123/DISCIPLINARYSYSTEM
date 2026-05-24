const nodemailer = require('nodemailer');
const { query } = require('../config/db');
const { writeAuditLog } = require('../middleware/audit');

// ── Email transport ─────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── SMS via Termii ──────────────────────────────────────────────────────────

async function sendSms(phone, message) {
  if (!process.env.TERMII_API_KEY) return; // skip if not configured
  await fetch('https://api.ng.termii.com/api/sms/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: phone,
      from: process.env.TERMII_SENDER_ID || 'TIDDS',
      sms: message,
      type: 'plain',
      channel: 'generic',
      api_key: process.env.TERMII_API_KEY,
    }),
  });
}

// ── Core dispatch ───────────────────────────────────────────────────────────

/**
 * Dispatches a notification (email and/or SMS), persists a log record,
 * and writes to the audit log.
 *
 * @param {object} opts
 * @param {string} opts.caseId
 * @param {string} opts.recipientId  - user.id
 * @param {string} opts.recipientEmail
 * @param {string} opts.recipientPhone  - optional
 * @param {string} opts.templateName
 * @param {string} opts.subject
 * @param {string} opts.body         - HTML for email
 * @param {string} opts.smsBody      - plain text for SMS
 * @param {string} opts.institutionId
 * @param {string} opts.actorId
 * @param {string} opts.actorRole
 */
async function dispatch(opts) {
  const {
    caseId,
    recipientId,
    recipientEmail,
    recipientPhone,
    templateName,
    subject,
    body,
    smsBody,
    institutionId,
    actorId,
    actorRole,
  } = opts;

  // Persist notification record (pending)
  const { rows: [notifRow] } = await query(
    `INSERT INTO notifications
       (case_id, recipient_id, channel, template_name, subject, body, status)
     VALUES ($1,$2,'email',$3,$4,$5,'pending')
     RETURNING id`,
    [caseId, recipientId, templateName, subject, body]
  );

  // Send email
  let emailStatus = 'sent';
  let emailError = null;
  try {
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.SMTP_USER}>`,
      to: recipientEmail,
      subject,
      html: body,
    });
  } catch (err) {
    emailStatus = 'failed';
    emailError = err.message;
  }

  await query(
    `UPDATE notifications
     SET status = $1, sent_at = $2, error_message = $3
     WHERE id = $4`,
    [emailStatus, emailStatus === 'sent' ? new Date() : null, emailError, notifRow.id]
  );

  // Send SMS if phone available
  if (recipientPhone && smsBody) {
    try {
      await sendSms(recipientPhone, smsBody);
      await query(
        `INSERT INTO notifications
           (case_id, recipient_id, channel, template_name, subject, body, status, sent_at)
         VALUES ($1,$2,'sms',$3,$4,$5,'sent',NOW())`,
        [caseId, recipientId, templateName, null, smsBody]
      );
    } catch {
      await query(
        `INSERT INTO notifications
           (case_id, recipient_id, channel, template_name, subject, body, status)
         VALUES ($1,$2,'sms',$3,$4,$5,'failed')`,
        [caseId, recipientId, templateName, null, smsBody]
      );
    }
  }

  await writeAuditLog({
    institutionId,
    actorId,
    actorRole,
    action: emailStatus === 'sent' ? 'notification_sent' : 'notification_failed',
    caseId,
    targetId: recipientId,
    targetType: 'user',
    metadata: { templateName, channel: 'email', emailStatus },
  });
}

// ── Email templates ─────────────────────────────────────────────────────────

function wrapHtml(institutionName, content) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #1a1a1a; line-height: 1.6; max-width: 640px; margin: 0 auto; padding: 24px; }
    .header { background: #003366; color: #fff; padding: 20px 24px; border-radius: 6px 6px 0 0; }
    .header h1 { margin: 0; font-size: 18px; }
    .body { border: 1px solid #ddd; border-top: none; padding: 24px; border-radius: 0 0 6px 6px; }
    .ref { background: #f5f5f5; border-left: 4px solid #003366; padding: 10px 14px; margin: 16px 0; font-size: 13px; }
    .btn { display: inline-block; background: #003366; color: #fff; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: bold; margin: 16px 0; }
    .footer { font-size: 12px; color: #666; margin-top: 24px; border-top: 1px solid #eee; padding-top: 12px; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 4px; margin: 12px 0; }
  </style>
</head>
<body>
  <div class="header"><h1>${institutionName} — Disciplinary System</h1></div>
  <div class="body">${content}</div>
  <div class="footer">
    This is an official communication from the ${institutionName} Disciplinary Management System.
    Do not reply to this email. For enquiries, contact the Office of the Registrar.
  </div>
</body>
</html>`;
}

function complaintNotice({ institutionName, studentName, caseRef, officerName, officerDesignation,
  offenceDescription, regulationBreached, incidentDate, portalUrl, responseDeadline }) {
  const content = `
    <p>Dear ${studentName},</p>
    <p>A formal disciplinary complaint has been filed against you at ${institutionName}.
    You are required to read the particulars below carefully and submit your written response
    within the stipulated timeframe.</p>

    <div class="ref">
      <strong>Case Reference:</strong> ${caseRef}<br>
      <strong>Date Filed:</strong> ${new Date().toLocaleDateString('en-GB', { dateStyle: 'long' })}<br>
      <strong>Filed by:</strong> ${officerName} — ${officerDesignation}
    </div>

    <h3>Particulars of Complaint</h3>
    <p><strong>Alleged Offence:</strong><br>${offenceDescription}</p>
    ${regulationBreached ? `<p><strong>Regulation Alleged to Have Been Breached:</strong><br>${regulationBreached}</p>` : ''}
    ${incidentDate ? `<p><strong>Date of Incident:</strong> ${incidentDate}</p>` : ''}

    <div class="warning">
      <strong>Important:</strong> You are required to submit your written response
      <strong>no later than ${responseDeadline}</strong>. Failure to respond within this period
      will be noted on your case record and the committee will proceed accordingly.
    </div>

    <p>Your response must:</p>
    <ul>
      <li>Directly address the particulars of the complaint</li>
      <li>State clearly whether you <strong>admit</strong> or <strong>deny</strong> the alleged offence</li>
      <li>Include any digital evidence you wish to rely upon</li>
    </ul>

    <a href="${portalUrl}" class="btn">Access Your Student Disciplinary Portal</a>

    <p>This link directs you to your personal disciplinary portal section, through which all
    further communications in this matter will be conducted.</p>`;

  return {
    subject: `[${caseRef}] Formal Disciplinary Complaint — Action Required`,
    html: wrapHtml(institutionName, content),
    sms: `[${institutionName}] A disciplinary complaint (${caseRef}) has been filed against you. Log in to your student portal immediately to respond. Deadline: ${responseDeadline}.`,
  };
}

function responseReminder({ institutionName, studentName, caseRef, portalUrl, hoursRemaining }) {
  const content = `
    <p>Dear ${studentName},</p>
    <div class="warning">
      <strong>Reminder:</strong> Your response to disciplinary case <strong>${caseRef}</strong>
      is due in <strong>${hoursRemaining} hours</strong>. You have not yet submitted a response.
    </div>
    <p>Failure to respond before the deadline will be recorded on your case file.</p>
    <a href="${portalUrl}" class="btn">Submit Your Response Now</a>`;

  return {
    subject: `[${caseRef}] Reminder — Response Deadline in ${hoursRemaining} Hours`,
    html: wrapHtml(institutionName, content),
    sms: `[${institutionName}] REMINDER: Your response to case ${caseRef} is due in ${hoursRemaining}hrs. Log in to your portal immediately.`,
  };
}

function appearanceNotice({ institutionName, studentName, caseRef, hearingDate, hearingTime,
  venue, charges, penaltyRange, portalUrl }) {
  const content = `
    <p>Dear ${studentName},</p>
    <p>You are hereby formally summoned to appear before the constituted Disciplinary Panel
    in connection with case <strong>${caseRef}</strong>.</p>

    <div class="ref">
      <strong>Hearing Date:</strong> ${hearingDate}<br>
      <strong>Time:</strong> ${hearingTime}<br>
      <strong>Venue:</strong> ${venue}
    </div>

    <h3>Charges You Will Face</h3>
    <p>${charges}</p>

    <h3>Rules Governing Your Appearance</h3>
    <ul>
      <li>You must appear in person at the time and venue specified above.</li>
      <li>You have the right to present oral submissions and evidence before the panel.</li>
      <li>All physical evidence must correspond to materials already submitted digitally through your portal.</li>
      <li>You may not be accompanied by legal counsel at the hearing unless expressly permitted by the panel.</li>
      <li>Professional and respectful conduct is required throughout proceedings.</li>
    </ul>

    <h3>Potential Penalties</h3>
    <p>${penaltyRange}</p>

    <div class="warning">
      Failure to appear without prior notice to the panel will be treated as a waiver of your
      right to be heard, and proceedings may continue in your absence.
    </div>

    <a href="${portalUrl}" class="btn">View Your Case File</a>`;

  return {
    subject: `[${caseRef}] OFFICIAL SUMMONS — Appearance Before Disciplinary Panel`,
    html: wrapHtml(institutionName, content),
    sms: `[${institutionName}] SUMMONS: You must appear before the Disciplinary Panel on ${hearingDate} at ${hearingTime}, ${venue}. Case: ${caseRef}. Log in to your portal for full details.`,
  };
}

function verdictLetter({ institutionName, studentName, caseRef, outcome, penalty,
  effectiveDate, conditions, appealRights }) {
  const outcomeLabel = outcome === 'upheld' ? 'UPHELD' : outcome === 'dismissed' ? 'DISMISSED' : 'REFERRED';
  const content = `
    <p>Dear ${studentName},</p>
    <p>The Disciplinary Panel has concluded its proceedings in respect of case
    <strong>${caseRef}</strong>. The formal outcome is set out below.</p>

    <div class="ref">
      <strong>Finding:</strong> Complaint <strong>${outcomeLabel}</strong><br>
      ${penalty ? `<strong>Penalty:</strong> ${penalty}<br>` : ''}
      ${effectiveDate ? `<strong>Effective Date:</strong> ${effectiveDate}<br>` : ''}
    </div>

    ${conditions ? `<h3>Conditions</h3><p>${conditions}</p>` : ''}
    ${appealRights ? `<h3>Right of Appeal</h3><p>${appealRights}</p>` : ''}

    <p>This decision has been formally recorded in your disciplinary record.</p>`;

  return {
    subject: `[${caseRef}] Disciplinary Outcome — ${outcomeLabel}`,
    html: wrapHtml(institutionName, content),
    sms: `[${institutionName}] Disciplinary verdict for case ${caseRef}: ${outcomeLabel}. ${penalty ? 'Penalty: ' + penalty + '.' : ''} Log in to your portal for full details.`,
  };
}

function panelInvitation({ institutionName, memberName, caseRef, panelRole }) {
  const content = `
    <p>Dear ${memberName},</p>
    <p>You have been assigned as <strong>${panelRole}</strong> on the Disciplinary Panel
    constituted to hear case <strong>${caseRef}</strong>.</p>
    <p>The complete case file — including the complaint particulars, all filed evidence,
    and the student's written response — is available in your panel dashboard.</p>`;

  return {
    subject: `[${caseRef}] Panel Assignment — ${panelRole}`,
    html: wrapHtml(institutionName, content),
    sms: null,
  };
}

module.exports = {
  dispatch,
  templates: { complaintNotice, responseReminder, appearanceNotice, verdictLetter, panelInvitation },
};
