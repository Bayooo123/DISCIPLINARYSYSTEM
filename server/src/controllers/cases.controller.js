import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { validationResult } from 'express-validator';
import { generateCaseReference } from '../utils/caseRef.utils.js';
import { addWorkingDays } from '../utils/workingDays.utils.js';
import { lookupStudent } from '../services/sis.service.js';
import { dispatchEmail, complaintNoticeHtml, officerConfirmationHtml } from '../services/notification.service.js';

const prisma = new PrismaClient();

const CASE_INCLUDE = {
  student:   true,
  filedBy:   { select: { id: true, firstName: true, lastName: true, email: true, department: true } },
  offences:  { include: { offenceType: true } },
  evidence:  true,
  auditLogs: { orderBy: { timestamp: 'asc' } },
  panel:     { include: { members: { include: { user: { select: { id: true, firstName: true, lastName: true } } } } } },
};

export async function fileComplaint(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const officer      = req.user;
    const institutionId = officer.institutionId;

    const {
      matricNumber,
      originType,
      offenceTypeIds,
      description,
      incidentDate,
      incidentLocation,
      witnessName,
      courseCode,
      courseTitle,
    } = req.body;

    const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
    if (!institution) return res.status(404).json({ error: 'Institution not found' });

    // SIS lookup
    const student = await lookupStudent(matricNumber, institution);
    if (!student) return res.status(404).json({ error: `No student found with matric number ${matricNumber}` });

    // Validate offence types belong to this institution
    const offenceTypes = await prisma.offenceType.findMany({
      where: { id: { in: offenceTypeIds }, institutionId, isActive: true },
    });
    if (offenceTypes.length !== offenceTypeIds.length) {
      return res.status(422).json({ error: 'One or more invalid offence type IDs' });
    }

    const referenceNumber   = await generateCaseReference(institutionId);
    const responseDeadline  = addWorkingDays(new Date(), 3);

    const newCase = await prisma.case.create({
      data: {
        referenceNumber,
        institutionId,
        studentId:       student.id,
        filedById:       officer.userId,
        originType:      originType || 'FACULTY',
        description,
        incidentDate:    new Date(incidentDate),
        incidentLocation: incidentLocation || null,
        witnessName:     witnessName || null,
        courseCode:      courseCode  || null,
        courseTitle:     courseTitle || null,
        responseDeadline,
        status:          'COMPLAINT_FILED',
        offences: {
          create: offenceTypeIds.map(id => ({ offenceTypeId: id })),
        },
      },
      include: CASE_INCLUDE,
    });

    // Audit log — complaint filed
    await prisma.auditLog.create({
      data: {
        caseId:      newCase.id,
        actorId:     officer.userId,
        action:      'COMPLAINT_FILED',
        description: `Complaint filed by ${officer.firstName} ${officer.lastName} (${originType}) against ${student.firstName} ${student.lastName} (${matricNumber}). Offences: ${offenceTypes.map(o => o.name).join(', ')}.`,
        metadata:    { offenceTypeIds, incidentDate, originType, courseCode: courseCode || null },
      },
    });

    // Update case status to STUDENT_NOTIFIED
    await prisma.case.update({ where: { id: newCase.id }, data: { status: 'STUDENT_NOTIFIED' } });

    // Send student notification email (non-fatal)
    const studentEmailHtml = complaintNoticeHtml({
      student,
      referenceNumber,
      filedAt:          newCase.filedAt,
      offenceTypes,
      incidentDate:     new Date(incidentDate),
      incidentLocation: incidentLocation || '',
      courseCode:       courseCode || null,
      courseTitle:      courseTitle || null,
      responseDeadline,
      portalUrl:        process.env.CLIENT_URL || 'http://localhost:5173',
    });

    try {
      await dispatchEmail({
        institutionId,
        institution,
        to:      student.email,
        subject: `Notice of Disciplinary Complaint — ${referenceNumber}`,
        html:    studentEmailHtml,
        type:    'COMPLAINT_NOTICE',
        caseId:  newCase.id,
      });
      await prisma.auditLog.create({
        data: {
          caseId:      newCase.id,
          actorId:     null,
          action:      'STUDENT_NOTIFIED_EMAIL',
          description: `Complaint notice email sent to ${student.email}.`,
          metadata:    { emailStatus: 'SENT', recipientEmail: student.email },
        },
      });
    } catch (_) {}

    // Send officer confirmation email (non-fatal)
    const officerUser = await prisma.user.findUnique({ where: { id: officer.userId } });
    const officerEmailHtml = officerConfirmationHtml({
      officer:         officerUser,
      student,
      referenceNumber,
      filedAt:         newCase.filedAt,
      offenceTypes,
      responseDeadline,
      platformUrl:     process.env.CLIENT_URL || 'http://localhost:5173',
    });

    try {
      await dispatchEmail({
        institutionId,
        to:      officer.email,
        subject: `Complaint Filed Successfully — ${referenceNumber}`,
        html:    officerEmailHtml,
        type:    'COMPLAINT_NOTICE',
        caseId:  newCase.id,
      });
      await prisma.auditLog.create({
        data: {
          caseId:      newCase.id,
          actorId:     null,
          action:      'OFFICER_CONFIRMATION_EMAIL',
          description: `Filing confirmation email sent to ${officer.email}.`,
          metadata:    { emailStatus: 'SENT', recipientEmail: officer.email },
        },
      });
    } catch (_) {}

    // Update status to AWAITING_RESPONSE
    await prisma.case.update({ where: { id: newCase.id }, data: { status: 'AWAITING_RESPONSE' } });

    const finalCase = await prisma.case.findUnique({ where: { id: newCase.id }, include: CASE_INCLUDE });
    res.status(201).json(finalCase);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getMyCases(req, res) {
  try {
    const officer = req.user;
    const { status, from, to, search, page = 1, limit = 20 } = req.query;

    const where = { filedById: officer.userId, institutionId: officer.institutionId };
    if (status) where.status = status;
    if (from || to) {
      where.filedAt = {};
      if (from) where.filedAt.gte = new Date(from);
      if (to)   where.filedAt.lte = new Date(to);
    }
    if (search) {
      where.OR = [
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { student: { firstName:  { contains: search, mode: 'insensitive' } } },
        { student: { lastName:   { contains: search, mode: 'insensitive' } } },
        { student: { matricNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await prisma.case.count({ where });
    const cases = await prisma.case.findMany({
      where,
      skip,
      take:    parseInt(limit),
      orderBy: { filedAt: 'desc' },
      include: {
        student:  { select: { id: true, firstName: true, lastName: true, matricNumber: true, faculty: true } },
        offences: { include: { offenceType: { select: { id: true, name: true, penaltyTier: true, category: true } } } },
      },
    });

    res.json({ cases, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getCaseById(req, res) {
  try {
    const { id } = req.params;
    const officer = req.user;

    const c = await prisma.case.findUnique({ where: { id }, include: CASE_INCLUDE });
    if (!c) return res.status(404).json({ error: 'Case not found' });

    // Scoping: COMPLAINTS_OFFICER can only see their own cases
    if (officer.role === 'COMPLAINTS_OFFICER' && c.filedById !== officer.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Scoping: institution users can only see their own institution's cases
    if (officer.role !== 'PLATFORM_ADMIN' && c.institutionId !== officer.institutionId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(c);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function uploadEvidence(req, res) {
  try {
    const { id } = req.params;
    const officer = req.user;

    const c = await prisma.case.findUnique({ where: { id } });
    if (!c) return res.status(404).json({ error: 'Case not found' });
    if (c.filedById !== officer.userId) return res.status(403).json({ error: 'Access denied' });

    if (!req.files || req.files.length === 0) {
      return res.status(422).json({ error: 'No files uploaded' });
    }

    const records = await Promise.all(
      req.files.map(f =>
        prisma.evidence.create({
          data: {
            caseId:       id,
            uploadedById: officer.userId,
            submittedBy:  'COMPLAINANT',
            fileName:     f.originalname,
            fileUrl:      `/uploads/${f.filename}`,
            fileType:     f.mimetype,
            fileSize:     f.size,
          },
        })
      )
    );

    res.status(201).json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getEvidence(req, res) {
  try {
    const { id } = req.params;
    const officer = req.user;

    const c = await prisma.case.findUnique({ where: { id } });
    if (!c) return res.status(404).json({ error: 'Case not found' });

    if (officer.role === 'COMPLAINTS_OFFICER' && c.filedById !== officer.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const evidence = await prisma.evidence.findMany({ where: { caseId: id }, orderBy: { uploadedAt: 'asc' } });
    res.json(evidence);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getOfficerDashboard(req, res) {
  try {
    const officer = req.user;
    const yearStart = new Date(new Date().getFullYear(), 0, 1);

    const [total, pendingResponse, hearingScheduled, resolvedThisYear, recentCases] = await Promise.all([
      prisma.case.count({ where: { filedById: officer.userId } }),
      prisma.case.count({ where: { filedById: officer.userId, status: 'AWAITING_RESPONSE' } }),
      prisma.case.count({ where: { filedById: officer.userId, status: 'HEARING_SCHEDULED' } }),
      prisma.case.count({ where: { filedById: officer.userId, status: 'CLOSED', closedAt: { gte: yearStart } } }),
      prisma.case.findMany({
        where:   { filedById: officer.userId },
        take:    5,
        orderBy: { filedAt: 'desc' },
        include: {
          student:  { select: { firstName: true, lastName: true, matricNumber: true } },
          offences: { include: { offenceType: { select: { name: true, penaltyTier: true } } }, take: 1 },
        },
      }),
    ]);

    res.json({ total, pendingResponse, hearingScheduled, resolvedThisYear, recentCases });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
