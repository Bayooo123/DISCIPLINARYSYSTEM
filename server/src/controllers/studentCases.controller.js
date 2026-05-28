import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dispatchEmail, studentAcknowledgementHtml, officerResponseAlertHtml } from '../services/notification.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const STUDENT_CASE_INCLUDE = {
  institution: { select: { id: true, name: true, shortName: true, primaryColor: true, contactEmail: true } },
  student:     true,
  filedBy:     { select: { id: true, firstName: true, lastName: true, department: true } },
  offences:    { include: { offenceType: { select: { id: true, name: true, category: true } } } },
  evidence:    true,
  auditLogs:   { orderBy: { timestamp: 'asc' } },
  panel:       { include: { members: { include: { user: { select: { id: true, firstName: true, lastName: true } } } } } },
};

export async function getStudentCases(req, res) {
  try {
    const { studentId } = req.student;
    const cases = await prisma.case.findMany({
      where: { studentId },
      orderBy: { filedAt: 'desc' },
      select: {
        id: true, referenceNumber: true, status: true,
        filedAt: true, responseDeadline: true,
        studentResponseAt: true, studentResponseLocked: true,
        hearingDate: true, hearingVenue: true,
        verdictAt: true, verdict: true, penalty: true,
        offences: { include: { offenceType: { select: { name: true } } } },
      },
    });
    res.json(cases);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getStudentCaseById(req, res) {
  try {
    const { id } = req.params;
    const { studentId } = req.student;

    const c = await prisma.case.findUnique({ where: { id }, include: STUDENT_CASE_INCLUDE });
    if (!c) return res.status(403).json({ error: 'Access denied' });
    if (c.studentId !== studentId) return res.status(403).json({ error: 'Access denied' });

    // Write view audit log (non-fatal)
    prisma.auditLog.create({
      data: {
        caseId:      c.id,
        actorId:     null,
        action:      'STUDENT_VIEWED_COMPLAINT',
        description: `Student ${c.student.matricNumber} viewed complaint details for case ${c.referenceNumber}.`,
      },
    }).catch(() => {});

    // Strip fileUrl from complainant evidence — student sees names only
    const safeCase = {
      ...c,
      studentAccessToken:  undefined,
      studentAccessExpiry: undefined,
      evidence: c.evidence.map(e => ({
        ...e,
        fileUrl: e.submittedBy === 'COMPLAINANT' ? null : e.fileUrl,
      })),
    };

    res.json(safeCase);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function submitStudentResponse(req, res) {
  try {
    const { id } = req.params;
    const { studentId, matricNumber } = req.student;

    const c = await prisma.case.findUnique({
      where: { id },
      include: { student: true, institution: true, offences: { include: { offenceType: true } } },
    });

    if (!c) return res.status(403).json({ error: 'Access denied' });
    if (c.studentId !== studentId) return res.status(403).json({ error: 'Access denied' });

    // Preconditions
    if (!['AWAITING_RESPONSE', 'STUDENT_NOTIFIED', 'RESPONSE_RECEIVED'].includes(c.status)) {
      return res.status(422).json({ error: 'This case is no longer accepting responses.' });
    }
    if (new Date() > c.responseDeadline) {
      return res.status(422).json({ error: 'The response deadline has passed.' });
    }
    if (c.studentResponseLocked) {
      return res.status(403).json({
        error: 'Your response has already been edited once and is now locked. Contact the committee if you need to make further changes.',
      });
    }

    const { plea, statement } = req.body;
    if (!plea || !['GUILTY', 'NOT_GUILTY'].includes(plea)) {
      return res.status(422).json({ error: 'A valid plea (GUILTY or NOT_GUILTY) is required.' });
    }
    if (!statement || statement.trim().length < 30) {
      return res.status(422).json({ error: 'Your statement must be at least 30 characters.' });
    }

    const isEdit = !!c.studentResponse;
    const nowLocked = isEdit; // lock after one edit

    // Update case
    const updated = await prisma.case.update({
      where: { id },
      data: {
        plea,
        studentResponse:       statement.trim(),
        studentResponseAt:     new Date(),
        studentResponseEdited: isEdit ? true : c.studentResponseEdited,
        studentResponseLocked: nowLocked,
        status:                'RESPONSE_RECEIVED',
      },
    });

    // Upload any evidence files
    const files = req.files || [];
    if (files.length > 0) {
      await Promise.all(files.map(f =>
        prisma.evidence.create({
          data: {
            caseId:       id,
            uploadedById: c.studentId,
            submittedBy:  'STUDENT',
            fileName:     f.originalname,
            fileUrl:      `/uploads/${f.filename}`,
            fileType:     f.mimetype,
            fileSize:     f.size,
          },
        })
      ));
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        caseId:      id,
        actorId:     null,
        action:      isEdit ? 'STUDENT_RESPONSE_EDITED' : 'STUDENT_RESPONSE_SUBMITTED',
        description: isEdit
          ? `Student ${matricNumber} edited their response for case ${c.referenceNumber}. Response is now locked.`
          : `Student ${matricNumber} submitted response for case ${c.referenceNumber}. Plea: ${plea}.`,
        metadata: { plea, evidenceCount: files.length, statementLength: statement.trim().length },
      },
    });

    // Acknowledgement email to student (non-fatal)
    try {
      const html = studentAcknowledgementHtml({
        student:          c.student,
        referenceNumber:  c.referenceNumber,
        plea,
        submittedAt:      new Date(),
        responseDeadline: c.responseDeadline,
        isEdit,
        isLocked:         nowLocked,
        portalUrl:        `${process.env.STUDENT_PORTAL_URL || 'http://localhost:5174'}/access/${c.studentAccessToken}`,
      });
      await dispatchEmail({
        institutionId: c.institutionId,
        institution:   c.institution,
        to:            c.student.email,
        subject:       `Response Received — Case ${c.referenceNumber}`,
        html,
        type:          'COMPLAINT_NOTICE',
        caseId:        id,
      });
    } catch (_) {}

    // Officer alert email (non-fatal)
    try {
      const officerUser = await prisma.user.findUnique({ where: { id: c.filedById } });
      if (officerUser) {
        const html = officerResponseAlertHtml({
          officer:         officerUser,
          student:         c.student,
          referenceNumber: c.referenceNumber,
          plea,
          responseText:    statement.trim(),
          platformUrl:     process.env.CLIENT_URL || 'http://localhost:5173',
        });
        await dispatchEmail({
          institutionId: c.institutionId,
          institution:   c.institution,
          to:            officerUser.email,
          subject:       `Student Response Received — ${c.referenceNumber}`,
          html,
          type:          'COMPLAINT_NOTICE',
          caseId:        id,
        });
      }
    } catch (_) {}

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getStudentEvidence(req, res) {
  try {
    const { id } = req.params;
    const { studentId } = req.student;

    const c = await prisma.case.findUnique({ where: { id } });
    if (!c || c.studentId !== studentId) return res.status(403).json({ error: 'Access denied' });

    const all = await prisma.evidence.findMany({ where: { caseId: id }, orderBy: { uploadedAt: 'asc' } });

    res.json({
      complainant: all
        .filter(e => e.submittedBy === 'COMPLAINANT')
        .map(e => ({ id: e.id, fileName: e.fileName, fileType: e.fileType, fileSize: e.fileSize, uploadedAt: e.uploadedAt })),
      student: all
        .filter(e => e.submittedBy === 'STUDENT'),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
