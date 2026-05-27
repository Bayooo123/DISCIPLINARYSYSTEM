import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { writeLog } from './log.service.js';

const prisma = new PrismaClient();

export async function lookupStudent(matricNumber, institution) {
  const existing = await prisma.student.findUnique({
    where: { matricNumber },
    include: { cases: { select: { id: true, status: true } } },
  });

  if (existing) {
    const { cases, ...student } = existing;
    return { ...student, priorCaseCount: cases.length, source: 'LOCAL' };
  }

  if (institution.sisApiUrl && institution.sisApiKey) {
    try {
      const response = await fetch(
        `${institution.sisApiUrl}/students/${encodeURIComponent(matricNumber)}`,
        {
          headers: { Authorization: `Bearer ${institution.sisApiKey}` },
          signal: AbortSignal.timeout(5000),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const student = await prisma.student.create({
          data: {
            institutionId: institution.id,
            matricNumber:  data.matricNumber,
            firstName:     data.firstName,
            lastName:      data.lastName,
            email:         data.email,
            phone:         data.phone   || null,
            faculty:       data.faculty,
            department:    data.department || null,
            level:         data.level,
            gpa:           data.gpa    || null,
          },
        });
        return { ...student, priorCaseCount: 0, source: 'SIS' };
      }
    } catch (err) {
      await writeLog({
        institutionId: institution.id,
        level:    'WARNING',
        category: 'INTEGRATION',
        message:  `SIS lookup failed for matric ${matricNumber}`,
        detail:   err.message,
      }).catch(() => {});
    }
  }

  return null;
}
