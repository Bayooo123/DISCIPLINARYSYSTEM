import { PrismaClient } from '@prisma/client';
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
