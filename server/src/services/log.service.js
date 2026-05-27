import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function writeLog({ institutionId, level, category, message, detail, metadata }) {
  return prisma.systemLog.create({
    data: { institutionId: institutionId || null, level, category, message, detail, metadata },
  });
}
