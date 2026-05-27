import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

export async function generateCaseReference(institutionId) {
  const year = new Date().getFullYear();
  const prefix = `DSC-${year}`;

  const latest = await prisma.case.findFirst({
    where: { institutionId, referenceNumber: { startsWith: prefix } },
    orderBy: { referenceNumber: 'desc' },
  });

  let nextNum = 1;
  if (latest) {
    const parts = latest.referenceNumber.split('-');
    nextNum = parseInt(parts[2], 10) + 1;
  }

  return `${prefix}-${String(nextNum).padStart(3, '0')}`;
}
