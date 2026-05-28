import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { sendEmail } from './email.service.js';
import { sendSMS } from './sms.service.js';

const prisma = new PrismaClient();

export async function dispatchEmail({ institutionId, institution, to, subject, html, type, caseId }) {
  let status = 'SENT';
  let errorMessage = null;
  let resolvedInstitution = institution;

  if (!resolvedInstitution && institutionId) {
    resolvedInstitution = await prisma.institution.findUnique({ where: { id: institutionId } });
  }

  try {
    await sendEmail({ institution: resolvedInstitution, to, subject, html });
  } catch (err) {
    status = 'FAILED';
    errorMessage = err.message;
  }

  await prisma.notification.create({
    data: {
      caseId:         caseId || null,
      recipientEmail: to,
      type:           type || 'COMPLAINT_NOTICE',
      channel:        'EMAIL',
      subject,
      body:           html,
      status,
      errorMessage,
      deliveredAt:    status === 'SENT' ? new Date() : null,
    },
  });

  await prisma.systemLog.create({
    data: {
      institutionId: institutionId || null,
      level:         status === 'SENT' ? 'INFO' : 'ERROR',
      category:      'EMAIL',
      message:       status === 'SENT'
        ? `Email sent successfully to ${to}`
        : `Email delivery failed to ${to}`,
      detail: errorMessage,
    },
  });

  if (status === 'FAILED') throw new Error(errorMessage);
}

export async function dispatchSMS({ institutionId, institution, to, message, type, caseId }) {
  let status = 'SENT';
  let errorMessage = null;
  let resolvedInstitution = institution;

  if (!resolvedInstitution && institutionId) {
    resolvedInstitution = await prisma.institution.findUnique({ where: { id: institutionId } });
  }

  try {
    await sendSMS({
      to,
      message,
      senderId: resolvedInstitution?.smsSenderId || undefined,
    });
  } catch (err) {
    status = 'FAILED';
    errorMessage = err.message;
  }

  await prisma.notification.create({
    data: {
      caseId:        caseId || null,
      recipientEmail: '',
      recipientPhone: to,
      type:           type || 'COMPLAINT_NOTICE',
      channel:        'SMS',
      body:           message,
      status,
      errorMessage,
      deliveredAt:    status === 'SENT' ? new Date() : null,
    },
  });

  await prisma.systemLog.create({
    data: {
      institutionId: institutionId || null,
      level:         status === 'SENT' ? 'INFO' : 'ERROR',
      category:      'SMS',
      message:       status === 'SENT'
        ? `SMS sent successfully to ${to}`
        : `SMS delivery failed to ${to}`,
      detail: errorMessage,
    },
  });

  if (status === 'FAILED') throw new Error(errorMessage);
}

export function complaintNoticeHtml({
  student,
  referenceNumber,
  filedAt,
  offenceTypes,
  incidentDate,
  incidentLocation,
  courseCode,
  courseTitle,
  responseDeadline,
  portalUrl,
}) {
  const fmt = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const offenceList = offenceTypes.map(o => `<li style="margin:4px 0;color:#1C1410;">${o.name}</li>`).join('');

  return `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#fff;">
      <div style="background:#7B1C1C;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
        <h1 style="color:#C9930A;font-family:Georgia,serif;margin:0;font-size:24px;">Disciplinary Notice</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">Reference: ${referenceNumber}</p>
      </div>
      <div style="border:1px solid #E0D8CC;border-top:none;padding:32px;border-radius:0 0 8px 8px;">
        <p style="color:#1C1410;margin:0 0 16px;">Dear ${student.firstName} ${student.lastName},</p>
        <p style="color:#1C1410;margin:0 0 16px;">
          A formal disciplinary complaint has been filed against you. Please review the details below and
          submit your response by the deadline indicated.
        </p>

        <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
          <tr><td style="padding:8px;background:#F7F3EE;color:#5A4E45;font-size:13px;width:40%;">Case Reference</td><td style="padding:8px;color:#1C1410;font-weight:600;">${referenceNumber}</td></tr>
          <tr><td style="padding:8px;color:#5A4E45;font-size:13px;">Student</td><td style="padding:8px;color:#1C1410;">${student.firstName} ${student.lastName} (${student.matricNumber})</td></tr>
          <tr><td style="padding:8px;background:#F7F3EE;color:#5A4E45;font-size:13px;">Incident Date</td><td style="padding:8px;background:#F7F3EE;color:#1C1410;">${fmt(incidentDate)}</td></tr>
          ${incidentLocation ? `<tr><td style="padding:8px;color:#5A4E45;font-size:13px;">Location</td><td style="padding:8px;color:#1C1410;">${incidentLocation}</td></tr>` : ''}
          ${courseCode ? `<tr><td style="padding:8px;background:#F7F3EE;color:#5A4E45;font-size:13px;">Course</td><td style="padding:8px;background:#F7F3EE;color:#1C1410;">${courseCode}${courseTitle ? ` — ${courseTitle}` : ''}</td></tr>` : ''}
          <tr><td style="padding:8px;color:#5A4E45;font-size:13px;">Filed On</td><td style="padding:8px;color:#1C1410;">${fmt(filedAt)}</td></tr>
        </table>

        <p style="color:#1C1410;font-weight:600;margin:0 0 8px;">Alleged Offence(s):</p>
        <ul style="margin:0 0 24px;padding-left:20px;">${offenceList}</ul>

        <div style="background:#FFF3CD;border:1px solid #C9930A;border-radius:6px;padding:16px;margin:0 0 24px;">
          <p style="margin:0;color:#7B5800;font-weight:600;">Response Deadline: ${fmt(responseDeadline)}</p>
          <p style="margin:4px 0 0;color:#7B5800;font-size:13px;">
            You are required to submit your response through the student portal before this date.
            Failure to respond may result in the case proceeding without your input.
          </p>
        </div>

        <div style="text-align:center;margin:32px 0;">
          <a href="${portalUrl}" style="background:#7B1C1C;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
            Submit My Response →
          </a>
        </div>

        <p style="color:#8A7F74;font-size:13px;margin:0;">
          If you believe this complaint was filed in error, you may state this in your response.
          For queries, contact your institution's disciplinary office.
        </p>
      </div>
      <p style="text-align:center;color:#8A7F74;font-size:12px;margin:16px 0 0;">
        TIDDS — Tertiary Institution Digital Disciplinary System<br/>
        Powered by Reforma Digital Solutions Ltd
      </p>
    </div>
  `;
}

export function officerConfirmationHtml({
  officer,
  student,
  referenceNumber,
  filedAt,
  offenceTypes,
  responseDeadline,
  platformUrl,
}) {
  const fmt = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const offenceList = offenceTypes.map(o => `<li style="margin:4px 0;color:#1C1410;">${o.name}</li>`).join('');

  return `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#fff;">
      <div style="background:#7B1C1C;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
        <h1 style="color:#C9930A;font-family:Georgia,serif;margin:0;font-size:24px;">Complaint Filed</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">Reference: ${referenceNumber}</p>
      </div>
      <div style="border:1px solid #E0D8CC;border-top:none;padding:32px;border-radius:0 0 8px 8px;">
        <p style="color:#1C1410;margin:0 0 16px;">Dear ${officer.firstName} ${officer.lastName},</p>
        <p style="color:#1C1410;margin:0 0 24px;">
          Your complaint has been successfully filed and the student has been notified.
          Below is a summary for your records.
        </p>

        <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
          <tr><td style="padding:8px;background:#F7F3EE;color:#5A4E45;font-size:13px;width:40%;">Reference</td><td style="padding:8px;color:#1C1410;font-weight:600;">${referenceNumber}</td></tr>
          <tr><td style="padding:8px;color:#5A4E45;font-size:13px;">Student</td><td style="padding:8px;color:#1C1410;">${student.firstName} ${student.lastName} (${student.matricNumber})</td></tr>
          <tr><td style="padding:8px;background:#F7F3EE;color:#5A4E45;font-size:13px;">Filed On</td><td style="padding:8px;background:#F7F3EE;color:#1C1410;">${fmt(filedAt)}</td></tr>
          <tr><td style="padding:8px;color:#5A4E45;font-size:13px;">Response Deadline</td><td style="padding:8px;color:#1C1410;">${fmt(responseDeadline)}</td></tr>
        </table>

        <p style="color:#1C1410;font-weight:600;margin:0 0 8px;">Offence(s) Recorded:</p>
        <ul style="margin:0 0 24px;padding-left:20px;">${offenceList}</ul>

        <div style="text-align:center;margin:32px 0;">
          <a href="${platformUrl}/officer/cases" style="background:#7B1C1C;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
            View Case →
          </a>
        </div>

        <p style="color:#8A7F74;font-size:13px;margin:0;">
          You will receive an alert when the student submits their response or when the deadline passes.
        </p>
      </div>
      <p style="text-align:center;color:#8A7F74;font-size:12px;margin:16px 0 0;">
        TIDDS — Tertiary Institution Digital Disciplinary System<br/>
        Powered by Reforma Digital Solutions Ltd
      </p>
    </div>
  `;
}

export function officerResponseAlertHtml({
  officer,
  student,
  referenceNumber,
  plea,
  responseText,
  platformUrl,
}) {
  return `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#fff;">
      <div style="background:#7B1C1C;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
        <h1 style="color:#C9930A;font-family:Georgia,serif;margin:0;font-size:24px;">Student Response Received</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">Reference: ${referenceNumber}</p>
      </div>
      <div style="border:1px solid #E0D8CC;border-top:none;padding:32px;border-radius:0 0 8px 8px;">
        <p style="color:#1C1410;margin:0 0 16px;">Dear ${officer.firstName} ${officer.lastName},</p>
        <p style="color:#1C1410;margin:0 0 24px;">
          <strong>${student.firstName} ${student.lastName}</strong> (${student.matricNumber}) has submitted
          a response to disciplinary complaint <strong>${referenceNumber}</strong>.
        </p>

        <div style="background:#F7F3EE;border-left:4px solid ${plea === 'GUILTY' ? '#C0392B' : '#27AE60'};padding:16px;border-radius:0 6px 6px 0;margin:0 0 24px;">
          <p style="margin:0 0 8px;color:#1C1410;font-weight:600;">Plea: <span style="color:${plea === 'GUILTY' ? '#C0392B' : '#27AE60'};">${plea.replace('_', ' ')}</span></p>
          ${responseText ? `<p style="margin:0;color:#5A4E45;font-size:14px;font-style:italic;">"${responseText.substring(0, 300)}${responseText.length > 300 ? '...' : ''}"</p>` : ''}
        </div>

        <div style="text-align:center;margin:32px 0;">
          <a href="${platformUrl}/officer/cases" style="background:#7B1C1C;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
            Review Response →
          </a>
        </div>
      </div>
      <p style="text-align:center;color:#8A7F74;font-size:12px;margin:16px 0 0;">
        TIDDS — Tertiary Institution Digital Disciplinary System<br/>
        Powered by Reforma Digital Solutions Ltd
      </p>
    </div>
  `;
}

export function officerVerdictAlertHtml({
  officer,
  student,
  referenceNumber,
  verdict,
  penalty,
  verdictAt,
  platformUrl,
}) {
  const fmt = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#fff;">
      <div style="background:#7B1C1C;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
        <h1 style="color:#C9930A;font-family:Georgia,serif;margin:0;font-size:24px;">Verdict Delivered</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">Reference: ${referenceNumber}</p>
      </div>
      <div style="border:1px solid #E0D8CC;border-top:none;padding:32px;border-radius:0 0 8px 8px;">
        <p style="color:#1C1410;margin:0 0 16px;">Dear ${officer.firstName} ${officer.lastName},</p>
        <p style="color:#1C1410;margin:0 0 24px;">
          A verdict has been delivered for disciplinary case <strong>${referenceNumber}</strong>
          against <strong>${student.firstName} ${student.lastName}</strong> (${student.matricNumber}).
        </p>

        <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
          <tr><td style="padding:8px;background:#F7F3EE;color:#5A4E45;font-size:13px;width:40%;">Verdict Date</td><td style="padding:8px;color:#1C1410;">${fmt(verdictAt)}</td></tr>
          ${penalty ? `<tr><td style="padding:8px;color:#5A4E45;font-size:13px;">Penalty</td><td style="padding:8px;color:#C0392B;font-weight:600;">${penalty}</td></tr>` : ''}
        </table>

        ${verdict ? `<p style="color:#1C1410;font-weight:600;margin:0 0 8px;">Verdict Summary:</p><p style="color:#5A4E45;margin:0 0 24px;font-size:14px;">${verdict}</p>` : ''}

        <div style="text-align:center;margin:32px 0;">
          <a href="${platformUrl}/officer/cases" style="background:#7B1C1C;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
            View Full Case →
          </a>
        </div>
      </div>
      <p style="text-align:center;color:#8A7F74;font-size:12px;margin:16px 0 0;">
        TIDDS — Tertiary Institution Digital Disciplinary System<br/>
        Powered by Reforma Digital Solutions Ltd
      </p>
    </div>
  `;
}

export function studentAcknowledgementHtml({
  student,
  referenceNumber,
  plea,
  submittedAt,
  responseDeadline,
  isEdit,
  isLocked,
  portalUrl,
}) {
  const fmt = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const fmtDt = d => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const pleaLabel = plea === 'GUILTY' ? 'Guilty' : 'Not Guilty';

  const editNote = isLocked
    ? `<p style="color:#5A4E45;margin:0 0 16px;">Your response is now <strong>final and cannot be changed</strong>.</p>`
    : !isEdit
    ? `<p style="color:#5A4E45;margin:0 0 16px;">Please note: you may update your response <strong>once</strong> before the deadline of <strong>${fmt(responseDeadline)}</strong>. After one update, your response will be permanently locked.</p>`
    : '';

  return `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#fff;">
      <div style="background:#7B1C1C;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
        <h1 style="color:#C9930A;font-family:Georgia,serif;margin:0;font-size:24px;">Response Received</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">Reference: ${referenceNumber}</p>
      </div>
      <div style="border:1px solid #E0D8CC;border-top:none;padding:32px;border-radius:0 0 8px 8px;">
        <p style="color:#1C1410;margin:0 0 16px;">Dear ${student.firstName},</p>
        <p style="color:#1C1410;margin:0 0 24px;">
          We have received your ${isEdit ? 'updated ' : ''}written response to Case <strong>${referenceNumber}</strong>.
        </p>

        <div style="background:#E8F5EE;border:1px solid #A8D5B8;border-radius:8px;padding:16px;margin:0 0 24px;">
          <p style="margin:0 0 8px;color:#1A6B42;font-weight:600;font-size:15px;">Submission Confirmed</p>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:4px 0;color:#4A3F35;font-size:13px;width:40%;">Case Reference</td><td style="padding:4px 0;color:#1C1410;font-weight:600;font-size:13px;">${referenceNumber}</td></tr>
            <tr><td style="padding:4px 0;color:#4A3F35;font-size:13px;">Plea</td><td style="padding:4px 0;color:#1C1410;font-size:13px;">${pleaLabel}</td></tr>
            <tr><td style="padding:4px 0;color:#4A3F35;font-size:13px;">Submitted</td><td style="padding:4px 0;color:#1C1410;font-size:13px;">${fmtDt(submittedAt)}</td></tr>
          </table>
        </div>

        ${editNote}

        <p style="color:#1C1410;font-weight:600;margin:0 0 8px;">What happens next</p>
        <p style="color:#5A4E45;margin:0 0 24px;">
          The Disciplinary Committee will review your submission and constitute a panel to hear your case.
          You will receive a formal hearing notice by email once a date has been set.
        </p>

        <div style="text-align:center;margin:32px 0;">
          <a href="${portalUrl}" style="background:#7B1C1C;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
            View My Case →
          </a>
        </div>

        <p style="color:#8A7F74;font-size:13px;margin:0;">
          Please retain this email as confirmation of your submission.
        </p>
      </div>
      <p style="text-align:center;color:#8A7F74;font-size:12px;margin:16px 0 0;">
        TIDDS — Tertiary Institution Digital Disciplinary System<br/>
        Powered by Reforma Digital Solutions Ltd
      </p>
    </div>
  `;
}

export function hearingNoticeHtml({
  student,
  referenceNumber,
  hearingDate,
  hearingVenue,
  panelName,
  offences,
  penaltyRange,
  portalUrl,
}) {
  const fmtDay = d => new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fmtTime = d => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const offenceList = offences.map((o, i) => `<li style="margin:4px 0;color:#1C1410;">${i + 1}. ${o.offenceType?.name || o.name}</li>`).join('');

  return `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#fff;">
      <div style="background:#7B1C1C;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
        <h1 style="color:#C9930A;font-family:Georgia,serif;margin:0;font-size:24px;">Hearing Notice</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">You Are Required to Appear — ${referenceNumber}</p>
      </div>
      <div style="border:1px solid #E0D8CC;border-top:none;padding:32px;border-radius:0 0 8px 8px;">
        <p style="color:#1C1410;margin:0 0 16px;">Dear ${student.firstName} ${student.lastName},</p>
        <p style="color:#1C1410;margin:0 0 24px;">
          You are hereby summoned to appear before the Disciplinary Panel in connection with Case
          <strong>${referenceNumber}</strong>.
        </p>

        <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
          <tr><td style="padding:8px;background:#F7F3EE;color:#5A4E45;font-size:13px;width:40%;">Date</td><td style="padding:8px;color:#1C1410;font-weight:600;">${fmtDay(hearingDate)}</td></tr>
          <tr><td style="padding:8px;color:#5A4E45;font-size:13px;">Time</td><td style="padding:8px;color:#1C1410;font-weight:600;">${fmtTime(hearingDate)}</td></tr>
          <tr><td style="padding:8px;background:#F7F3EE;color:#5A4E45;font-size:13px;">Venue</td><td style="padding:8px;background:#F7F3EE;color:#1C1410;">${hearingVenue}</td></tr>
          ${panelName ? `<tr><td style="padding:8px;color:#5A4E45;font-size:13px;">Panel</td><td style="padding:8px;color:#1C1410;">${panelName}</td></tr>` : ''}
        </table>

        <p style="color:#1C1410;font-weight:600;margin:0 0 8px;">Charges Against You:</p>
        <ol style="margin:0 0 24px;padding-left:20px;">${offenceList}</ol>

        ${penaltyRange ? `<p style="color:#1C1410;margin:0 0 24px;"><strong>Possible Penalty:</strong> ${penaltyRange}</p>` : ''}

        <div style="background:#F7F3EE;border-left:4px solid #7B1C1C;padding:16px;border-radius:0 6px 6px 0;margin:0 0 24px;">
          <p style="margin:0 0 8px;color:#1C1410;font-weight:600;">Rules Governing Your Appearance</p>
          <ol style="margin:0;padding-left:18px;color:#5A4E45;font-size:13px;line-height:1.8;">
            <li>Arrive punctually. Failure to appear may result in the panel proceeding in your absence.</li>
            <li>You may bring physical evidence that corresponds to materials already submitted digitally.</li>
            <li>You will be given a full and fair opportunity to address the panel and present your case.</li>
            <li>Legal counsel is not permitted unless expressly authorised in writing by the Committee.</li>
            <li>Conduct yourself with decorum throughout the proceedings.</li>
            <li>The verdict will be communicated within two (2) working days of the hearing.</li>
          </ol>
        </div>

        <div style="text-align:center;margin:32px 0;">
          <a href="${portalUrl}" style="background:#7B1C1C;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
            View Full Hearing Notice →
          </a>
        </div>
      </div>
      <p style="text-align:center;color:#8A7F74;font-size:12px;margin:16px 0 0;">
        TIDDS — Tertiary Institution Digital Disciplinary System<br/>
        Powered by Reforma Digital Solutions Ltd
      </p>
    </div>
  `;
}

export function verdictNoticeHtml({
  student,
  referenceNumber,
  finding,
  penalty,
  effectiveDate,
  verdictAt,
  portalUrl,
  contactEmail,
}) {
  const fmt = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const upheld = finding === 'UPHELD';

  return `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#fff;">
      <div style="background:#7B1C1C;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
        <h1 style="color:#C9930A;font-family:Georgia,serif;margin:0;font-size:24px;">Disciplinary Panel Verdict</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">Reference: ${referenceNumber}</p>
      </div>
      <div style="border:1px solid #E0D8CC;border-top:none;padding:32px;border-radius:0 0 8px 8px;">
        <p style="color:#1C1410;margin:0 0 16px;">Dear ${student.firstName} ${student.lastName},</p>
        <p style="color:#1C1410;margin:0 0 24px;">
          The Disciplinary Panel has reached a verdict in Case <strong>${referenceNumber}</strong>.
        </p>

        <div style="background:${upheld ? '#FDEAEA' : '#E8F5EE'};border:1px solid ${upheld ? '#D9A5A5' : '#A8D5B8'};border-radius:8px;padding:20px;margin:0 0 24px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#5A4E45;font-size:13px;width:40%;">Finding</td><td style="padding:6px 0;color:#1C1410;font-weight:700;font-size:15px;">${upheld ? 'The allegation has been upheld.' : 'The allegation has been dismissed.'}</td></tr>
            <tr><td style="padding:6px 0;color:#5A4E45;font-size:13px;">Penalty</td><td style="padding:6px 0;color:${upheld ? '#8B1A1A' : '#1A6B42'};font-weight:600;">${penalty || 'No penalty imposed'}</td></tr>
            ${effectiveDate ? `<tr><td style="padding:6px 0;color:#5A4E45;font-size:13px;">Effective Date</td><td style="padding:6px 0;color:#1C1410;">${fmt(effectiveDate)}</td></tr>` : ''}
            <tr><td style="padding:6px 0;color:#5A4E45;font-size:13px;">Verdict Date</td><td style="padding:6px 0;color:#1C1410;">${fmt(verdictAt)}</td></tr>
          </table>
        </div>

        ${upheld ? `
        <div style="background:#F7F3EE;border-left:4px solid #C9930A;padding:16px;border-radius:0 6px 6px 0;margin:0 0 24px;">
          <p style="margin:0 0 8px;color:#1C1410;font-weight:600;">Your Right of Appeal</p>
          <p style="margin:0;color:#5A4E45;font-size:13px;line-height:1.7;">
            If you wish to appeal this decision, you must submit a written notice of appeal to the
            Office of the Registrar within <strong>ten (10) working days</strong> of this notice.
            Your appeal must state the grounds and include any new evidence not previously presented.
          </p>
          ${contactEmail ? `<p style="margin:8px 0 0;color:#5A4E45;font-size:13px;">Contact: <a href="mailto:${contactEmail}" style="color:#7B1C1C;">${contactEmail}</a></p>` : ''}
        </div>` : `
        <p style="color:#5A4E45;margin:0 0 24px;">
          The Disciplinary Panel has considered the complaint and your response and has determined
          that the allegation against you is not upheld. This case is now closed.
          No further action will be taken.
        </p>`}

        <div style="text-align:center;margin:32px 0;">
          <a href="${portalUrl}" style="background:#7B1C1C;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
            View Full Record →
          </a>
        </div>

        <p style="color:#8A7F74;font-size:13px;margin:0;">
          This communication constitutes the University's official notification of the panel's decision.
        </p>
      </div>
      <p style="text-align:center;color:#8A7F74;font-size:12px;margin:16px 0 0;">
        TIDDS — Tertiary Institution Digital Disciplinary System<br/>
        Powered by Reforma Digital Solutions Ltd
      </p>
    </div>
  `;
}

// ── Template 8: Panel Assignment Notification ─────────────────────────────────
export function panelAssignmentHtml({ member, panelRole, referenceNumber, student, offences, filedAt, platformUrl, caseId }) {
  const fmt = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const roleLabel = panelRole === 'CHAIRPERSON' ? 'Chairperson' : panelRole === 'SECRETARY' ? 'Secretary' : 'Member';
  const offenceList = offences.map(o => `<li style="margin:4px 0;color:#1C1410;">${o.offenceType?.name || o.name}</li>`).join('');
  return `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#fff;">
      <div style="background:#7B1C1C;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
        <h1 style="color:#C9930A;font-family:Georgia,serif;margin:0;font-size:24px;">Panel Assignment</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">Case ${referenceNumber}</p>
      </div>
      <div style="border:1px solid #E0D8CC;border-top:none;padding:32px;border-radius:0 0 8px 8px;">
        <p style="color:#1C1410;margin:0 0 16px;">Dear ${member.firstName},</p>
        <p style="color:#1C1410;margin:0 0 24px;">
          You have been appointed as <strong>${roleLabel}</strong> of the Disciplinary Panel for Case <strong>${referenceNumber}</strong>.
        </p>
        <div style="background:#F7F3EE;border-top:3px solid #7B1C1C;padding:16px;border-radius:0 0 6px 6px;margin:0 0 24px;">
          <p style="margin:0 0 8px;color:#5A4E45;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Case Details</p>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#5A4E45;font-size:13px;width:35%;">Reference</td><td style="padding:6px 0;color:#1C1410;font-weight:600;">${referenceNumber}</td></tr>
            <tr><td style="padding:6px 0;color:#5A4E45;font-size:13px;">Student</td><td style="padding:6px 0;color:#1C1410;">${student.firstName} ${student.lastName} (${student.matricNumber})</td></tr>
            <tr><td style="padding:6px 0;color:#5A4E45;font-size:13px;">Faculty</td><td style="padding:6px 0;color:#1C1410;">${student.faculty}</td></tr>
            <tr><td style="padding:6px 0;color:#5A4E45;font-size:13px;">Filed</td><td style="padding:6px 0;color:#1C1410;">${fmt(filedAt)}</td></tr>
          </table>
        </div>
        <p style="color:#1C1410;font-weight:600;margin:0 0 8px;">Offence(s):</p>
        <ul style="margin:0 0 24px;padding-left:20px;">${offenceList}</ul>
        <p style="color:#5A4E45;margin:0 0 24px;">
          You can access the full case file, including the complaint particulars, evidence, and student response, by logging in to the TIDDS platform:
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${platformUrl}/panel/cases/${caseId}" style="background:#7B1C1C;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
            View Case File →
          </a>
        </div>
        <p style="color:#8A7F74;font-size:13px;">A hearing date will be communicated to you shortly.</p>
      </div>
      <p style="text-align:center;color:#8A7F74;font-size:12px;margin:16px 0 0;">TIDDS — Tertiary Institution Digital Disciplinary System<br/>Powered by Reforma Digital Solutions Ltd</p>
    </div>
  `;
}

// ── Template 9: Ratification Request to Secretary ────────────────────────────
export function ratificationRequestHtml({ secretary, chairpersonName, referenceNumber, student, verdictFinding, verdictPenalty, verdictEffectiveDate, verdictRecordedAt, platformUrl, caseId }) {
  const fmt = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const fmtDt = d => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const findingLabel = verdictFinding === 'UPHELD' ? 'UPHELD' : verdictFinding === 'DISMISSED' ? 'DISMISSED' : 'PARTIALLY UPHELD';
  return `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#fff;">
      <div style="background:#7B1C1C;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
        <h1 style="color:#C9930A;font-family:Georgia,serif;margin:0;font-size:24px;">Verdict Awaiting Ratification</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">Case ${referenceNumber}</p>
      </div>
      <div style="border:1px solid #E0D8CC;border-top:none;padding:32px;border-radius:0 0 8px 8px;">
        <p style="color:#1C1410;margin:0 0 16px;">Dear ${secretary.firstName},</p>
        <p style="color:#1C1410;margin:0 0 24px;">
          The Chairperson of the panel for Case <strong>${referenceNumber}</strong> has recorded a verdict. As Panel Secretary, your ratification is required before the verdict is communicated to the student.
        </p>
        <div style="background:#F7F3EE;border-top:3px solid #C9930A;padding:16px;border-radius:0 0 6px 6px;margin:0 0 24px;">
          <p style="margin:0 0 8px;color:#5A4E45;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Verdict Summary</p>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#5A4E45;font-size:13px;width:35%;">Case</td><td style="padding:6px 0;color:#1C1410;font-weight:600;">${referenceNumber}</td></tr>
            <tr><td style="padding:6px 0;color:#5A4E45;font-size:13px;">Student</td><td style="padding:6px 0;color:#1C1410;">${student.firstName} ${student.lastName} (${student.matricNumber})</td></tr>
            <tr><td style="padding:6px 0;color:#5A4E45;font-size:13px;">Finding</td><td style="padding:6px 0;color:#1C1410;font-weight:700;">${findingLabel}</td></tr>
            <tr><td style="padding:6px 0;color:#5A4E45;font-size:13px;">Penalty</td><td style="padding:6px 0;color:#1C1410;">${verdictPenalty || '—'}</td></tr>
            ${verdictEffectiveDate ? `<tr><td style="padding:6px 0;color:#5A4E45;font-size:13px;">Effective</td><td style="padding:6px 0;color:#1C1410;">${fmt(verdictEffectiveDate)}</td></tr>` : ''}
            <tr><td style="padding:6px 0;color:#5A4E45;font-size:13px;">Recorded By</td><td style="padding:6px 0;color:#1C1410;">${chairpersonName}</td></tr>
            <tr><td style="padding:6px 0;color:#5A4E45;font-size:13px;">Recorded At</td><td style="padding:6px 0;color:#1C1410;">${fmtDt(verdictRecordedAt)}</td></tr>
          </table>
        </div>
        <div style="background:#FFF3CD;border:1px solid #C9930A;border-radius:6px;padding:12px;margin:0 0 24px;">
          <p style="margin:0;color:#7B5800;font-size:13px;">The verdict will <strong>NOT</strong> be communicated to the student until you have confirmed your ratification.</p>
        </div>
        <div style="text-align:center;margin:32px 0;">
          <a href="${platformUrl}/panel/cases/${caseId}/ratify" style="background:#7B1C1C;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
            Review & Ratify Verdict →
          </a>
        </div>
      </div>
      <p style="text-align:center;color:#8A7F74;font-size:12px;margin:16px 0 0;">TIDDS — Tertiary Institution Digital Disciplinary System<br/>Powered by Reforma Digital Solutions Ltd</p>
    </div>
  `;
}

// ── Template 10: Non-Appearance Alert to Chairman ────────────────────────────
export function nonAppearanceAlertHtml({ chairman, referenceNumber, student, hearingDate, hearingTime, hearingVenue, flaggedAt, platformUrl, caseId }) {
  const fmt = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const fmtDt = d => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#fff;">
      <div style="background:#8B1A1A;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
        <h1 style="color:#FFCC00;font-family:Georgia,serif;margin:0;font-size:24px;">⚠ Student Did Not Appear</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">Case ${referenceNumber}</p>
      </div>
      <div style="border:1px solid #E0D8CC;border-top:none;padding:32px;border-radius:0 0 8px 8px;">
        <p style="color:#1C1410;margin:0 0 16px;">Dear ${chairman.firstName},</p>
        <p style="color:#1C1410;margin:0 0 24px;">
          The Panel Chairperson for Case <strong>${referenceNumber}</strong> has recorded that the student did not appear at the scheduled hearing.
        </p>
        <div style="background:#FDEAEA;border-top:3px solid #C0392B;padding:16px;border-radius:0 0 6px 6px;margin:0 0 24px;">
          <p style="margin:0 0 8px;color:#5A4E45;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Case Details</p>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#5A4E45;font-size:13px;width:35%;">Reference</td><td style="padding:6px 0;color:#1C1410;font-weight:600;">${referenceNumber}</td></tr>
            <tr><td style="padding:6px 0;color:#5A4E45;font-size:13px;">Student</td><td style="padding:6px 0;color:#1C1410;">${student.firstName} ${student.lastName} (${student.matricNumber})</td></tr>
            <tr><td style="padding:6px 0;color:#5A4E45;font-size:13px;">Hearing Date</td><td style="padding:6px 0;color:#1C1410;">${fmt(hearingDate)} at ${hearingTime || '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#5A4E45;font-size:13px;">Venue</td><td style="padding:6px 0;color:#1C1410;">${hearingVenue || '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#5A4E45;font-size:13px;">Flagged At</td><td style="padding:6px 0;color:#1C1410;">${fmtDt(flaggedAt)}</td></tr>
          </table>
        </div>
        <div style="background:#F7F3EE;border-left:4px solid #C9930A;padding:12px;border-radius:0 6px 6px 0;margin:0 0 24px;">
          <p style="margin:0;color:#5A4E45;font-size:13px;">Per University regulations, a student who fails to appear before the Misconduct Panel is subject to suspension. Please log in to the TIDDS platform to review this case and determine how to proceed.</p>
        </div>
        <div style="text-align:center;margin:32px 0;">
          <a href="${platformUrl}/committee/cases/${caseId}" style="background:#7B1C1C;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
            Review Case →
          </a>
        </div>
      </div>
      <p style="text-align:center;color:#8A7F74;font-size:12px;margin:16px 0 0;">TIDDS — Tertiary Institution Digital Disciplinary System<br/>Powered by Reforma Digital Solutions Ltd</p>
    </div>
  `;
}

export function invitationEmailHtml({ firstName, institutionName, role, activateUrl }) {
  return `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#fff;">
      <div style="background:#7B1C1C;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
        <h1 style="color:#C9930A;font-family:Georgia,serif;margin:0;font-size:24px;">TIDDS Platform</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">Tertiary Institution Digital Disciplinary System</p>
      </div>
      <div style="border:1px solid #E0D8CC;border-top:none;padding:32px;border-radius:0 0 8px 8px;">
        <p style="color:#1C1410;margin:0 0 16px;">Dear ${firstName},</p>
        <p style="color:#1C1410;margin:0 0 16px;">
          You have been added as <strong>${role.replace(/_/g, ' ')}</strong> on the
          <strong>${institutionName}</strong> Digital Disciplinary Platform (TIDDS)
          by Reforma Digital Solutions Ltd.
        </p>
        <p style="color:#1C1410;margin:0 0 24px;">
          Please click the button below to set your password and activate your account.
          This link will expire in <strong>72 hours</strong>.
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${activateUrl}" style="background:#7B1C1C;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
            Activate My Account →
          </a>
        </div>
        <p style="color:#8A7F74;font-size:13px;margin:0;">
          If you did not expect this invitation, please ignore this email.
        </p>
      </div>
      <p style="text-align:center;color:#8A7F74;font-size:12px;margin:16px 0 0;">
        TIDDS — Tertiary Institution Digital Disciplinary System<br/>
        Powered by Reforma Digital Solutions Ltd
      </p>
    </div>
  `;
}

