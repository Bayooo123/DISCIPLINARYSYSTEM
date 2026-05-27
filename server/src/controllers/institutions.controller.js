import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

const SAFE_SELECT = {
  id: true, name: true, slug: true, shortName: true, logoUrl: true,
  primaryColor: true, secondaryColor: true, address: true, website: true,
  contactEmail: true, contactPhone: true, country: true, state: true,
  smtpHost: true, smtpPort: true, smtpUser: true, emailFromName: true, emailFromAddr: true,
  smsEnabled: true, smsSenderId: true, sisApiUrl: true,
  licenceStatus: true, licenceStart: true, licenceEnd: true, contractRef: true,
  notes: true, isActive: true, createdAt: true, updatedAt: true,
  // smtpPass and sisApiKey intentionally excluded
};

export async function listInstitutions(req, res) {
  try {
    const institutions = await prisma.institution.findMany({
      where:   { isActive: true },
      select: {
        ...SAFE_SELECT,
        _count: { select: { users: true, cases: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(institutions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function createInstitution(req, res) {
  try {
    const institution = await prisma.institution.create({ data: req.body, select: SAFE_SELECT });
    res.status(201).json(institution);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Slug already in use' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getInstitution(req, res) {
  try {
    const institution = await prisma.institution.findUnique({
      where:  { id: req.params.id },
      select: {
        ...SAFE_SELECT,
        users:        { select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true, inviteAccepted: true } },
        offenceTypes: { select: { id: true, name: true, category: true, description: true, isActive: true, createdAt: true } },
        _count:       { select: { cases: true } },
      },
    });
    if (!institution) return res.status(404).json({ error: 'Institution not found' });
    res.json(institution);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function updateInstitution(req, res) {
  try {
    const data = { ...req.body };
    const institution = await prisma.institution.update({
      where: { id: req.params.id },
      data,
      select: SAFE_SELECT,
    });
    res.json(institution);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Institution not found' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function deleteInstitution(req, res) {
  try {
    await prisma.institution.update({
      where: { id: req.params.id },
      data:  { isActive: false },
    });
    res.json({ message: 'Institution deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}
