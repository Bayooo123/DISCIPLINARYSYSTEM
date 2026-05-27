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
