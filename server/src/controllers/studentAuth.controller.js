import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function validateToken(req, res) {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token is required' });

  try {
    const c = await prisma.case.findUnique({
      where: { studentAccessToken: token },
      include: {
        student: true,
        institution: { select: { id: true, name: true, shortName: true, primaryColor: true, logoUrl: true } },
      },
    });

    if (!c) return res.status(404).json({ error: 'This link is not valid.' });

    if (c.studentAccessExpiry && new Date() > c.studentAccessExpiry) {
      return res.status(410).json({
        error: 'This link has expired.',
        referenceNumber: c.referenceNumber,
        contactEmail: c.institution?.contactEmail || null,
      });
    }

    // Update last access timestamps
    await Promise.all([
      prisma.case.update({
        where: { id: c.id },
        data:  { studentLastAccessAt: new Date() },
      }),
      prisma.student.update({
        where: { id: c.studentId },
        data:  { portalLastSeenAt: new Date() },
      }),
    ]);

    // Write audit log
    await prisma.auditLog.create({
      data: {
        caseId:      c.id,
        actorId:     null,
        action:      'STUDENT_PORTAL_ACCESSED',
        description: `Student ${c.student.matricNumber} accessed portal for case ${c.referenceNumber}.`,
      },
    });

    // Issue student JWT — 4 hours
    const studentToken = jwt.sign(
      {
        studentId:     c.student.id,
        caseId:        c.id,
        institutionId: c.institutionId,
        matricNumber:  c.student.matricNumber,
        firstName:     c.student.firstName,
        lastName:      c.student.lastName,
        role:          'STUDENT',
      },
      process.env.JWT_SECRET,
      { expiresIn: '4h' }
    );

    res.json({
      studentToken,
      student: {
        firstName:      c.student.firstName,
        lastName:       c.student.lastName,
        matricNumber:   c.student.matricNumber,
        faculty:        c.student.faculty,
        level:          c.student.level,
        yearOfAdmission: c.student.yearOfAdmission,
      },
      institution: c.institution,
      caseId: c.id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getMe(req, res) {
  try {
    const { studentId } = req.student;
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true, firstName: true, lastName: true,
        matricNumber: true, faculty: true, department: true,
        level: true, yearOfAdmission: true, email: true,
        cases: {
          select: {
            id: true, referenceNumber: true, status: true,
            filedAt: true, responseDeadline: true,
            studentResponseAt: true, hearingDate: true, verdictAt: true,
            offences: { include: { offenceType: { select: { name: true } } } },
          },
          orderBy: { filedAt: 'desc' },
        },
      },
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
