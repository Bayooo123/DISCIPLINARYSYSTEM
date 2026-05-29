import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { sendEmail } from '../services/email.service.js';
import { sendSMS } from '../services/sms.service.js';
import { writeLog } from '../services/log.service.js';

const prisma = new PrismaClient();

function buildWhere({ institutionId, level, category, from, to, search }) {
  const where = {};
  if (institutionId) where.institutionId = institutionId;
  if (level)    where.level    = level;
  if (category) where.category = category;
  if (from || to) where.createdAt = {};
  if (from) where.createdAt.gte = new Date(from);
  if (to)   where.createdAt.lte = new Date(to);
  if (search) where.message = { contains: search, mode: 'insensitive' };
  return where;
}

export async function listLogs(req, res) {
  try {
    const { level, category, institutionId, from, to, search, page = 1, limit = 50 } = req.query;
    const where = buildWhere({ institutionId, level, category, from, to, search });
    const skip  = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      prisma.systemLog.findMany({
        where,
        include: { institution: { select: { name: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take:    Number(limit),
      }),
      prisma.systemLog.count({ where }),
    ]);

    res.json({ logs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function listInstitutionLogs(req, res) {
  try {
    const { institutionId } = req.params;
    if (req.user.role === 'INSTITUTION_ADMIN' && req.user.institutionId !== institutionId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    req.query.institutionId = institutionId;
    return listLogs(req, res);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function testEmail(req, res) {
  try {
    const { institutionId, testRecipient } = req.body;
    const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
    let status = 'success';
    let errorMsg = null;

    try {
      await sendEmail({
        institution,
        to:      testRecipient,
        subject: 'CANDOR — Test Email',
        html:    '<p>This is a test email from the CANDOR platform. Email delivery is working correctly.</p>',
      });
    } catch (err) {
      status = 'failed';
      errorMsg = err.message;
    }

    await writeLog({
      institutionId,
      level:    status === 'success' ? 'INFO' : 'ERROR',
      category: 'EMAIL',
      message:  status === 'success' ? `Test email sent to ${testRecipient}` : `Test email failed to ${testRecipient}`,
      detail:   errorMsg,
    });

    res.json({ status, error: errorMsg });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function testSMS(req, res) {
  try {
    const { institutionId, testPhone } = req.body;
    const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
    let status = 'success';
    let errorMsg = null;

    try {
      await sendSMS({
        to:       testPhone,
        message:  'This is a test SMS from the CANDOR platform.',
        senderId: institution?.smsSenderId,
      });
    } catch (err) {
      status = 'failed';
      errorMsg = err.message;
    }

    await writeLog({
      institutionId,
      level:    status === 'success' ? 'INFO' : 'ERROR',
      category: 'SMS',
      message:  status === 'success' ? `Test SMS sent to ${testPhone}` : `Test SMS failed to ${testPhone}`,
      detail:   errorMsg,
    });

    res.json({ status, error: errorMsg });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}
