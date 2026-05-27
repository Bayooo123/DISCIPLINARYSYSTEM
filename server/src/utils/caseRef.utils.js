import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function generateCaseRef(institutionSlug) {
  const year = new Date().getFullYear();
  const count = await prisma.case.count({
    where: {
      referenceNumber: { startsWith: `${institutionSlug.toUpperCase()}-${year}-` },
    },
  });
  const seq = String(count + 1).padStart(4, '0');
  return `${institutionSlug.toUpperCase()}-${year}-${seq}`;
}
