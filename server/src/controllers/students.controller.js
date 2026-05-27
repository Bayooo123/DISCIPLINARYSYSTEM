import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { lookupStudent } from '../services/sis.service.js';

const prisma = new PrismaClient();

export async function sisLookup(req, res) {
  try {
    const { matricNumber } = req.params;
    const institutionId = req.user.institutionId;

    const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
    if (!institution) return res.status(404).json({ error: 'Institution not found' });

    const student = await lookupStudent(matricNumber, institution);
    if (!student) {
      return res.status(404).json({
        error: institution.sisApiUrl
          ? 'Student not found in local records or SIS'
          : 'Student not found. SIS integration not configured for this institution.',
      });
    }

    res.json(student);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
