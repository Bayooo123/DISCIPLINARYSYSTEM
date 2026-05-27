import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function listOffenceTypes(req, res) {
  try {
    const { institutionId } = req.params;
    const types = await prisma.offenceType.findMany({
      where:   { institutionId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function createOffenceType(req, res) {
  try {
    const { institutionId } = req.params;
    const { name, category, description } = req.body;
    const offenceType = await prisma.offenceType.create({
      data: { institutionId, name, category, description },
    });
    res.status(201).json(offenceType);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function updateOffenceType(req, res) {
  try {
    const { id } = req.params;
    const { name, category, description, isActive } = req.body;
    const offenceType = await prisma.offenceType.update({
      where: { id },
      data:  { name, category, description, isActive },
    });
    res.json(offenceType);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function deleteOffenceType(req, res) {
  try {
    await prisma.offenceType.update({
      where: { id: req.params.id },
      data:  { isActive: false },
    });
    res.json({ message: 'Offence type deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}
