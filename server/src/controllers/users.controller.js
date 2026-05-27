import { PrismaClient } from '@prisma/client';
import { hashPassword, generateInviteToken } from '../utils/crypto.utils.js';
import { dispatchEmail, invitationEmailHtml } from '../services/notification.service.js';

const prisma = new PrismaClient();

const USER_SELECT = {
  id: true, institutionId: true, email: true, firstName: true, lastName: true,
  phone: true, role: true, department: true, jobTitle: true, avatarUrl: true,
  isActive: true, lastLoginAt: true, inviteAccepted: true, createdAt: true, updatedAt: true,
};

export async function listUsers(req, res) {
  try {
    const { institutionId } = req.params;
    if (req.user.role === 'INSTITUTION_ADMIN' && req.user.institutionId !== institutionId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const users = await prisma.user.findMany({
      where:   { institutionId },
      select:  USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function createUser(req, res) {
  try {
    const { institutionId } = req.params;
    const { firstName, lastName, email, phone, role, department, jobTitle } = req.body;

    const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
    if (!institution) return res.status(404).json({ error: 'Institution not found' });

    const token = generateInviteToken();
    const expiry = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const hash = await hashPassword(Math.random().toString(36));

    const user = await prisma.user.create({
      data: {
        institutionId, firstName, lastName, email, phone, role,
        department, jobTitle, passwordHash: hash,
        inviteToken: token, inviteExpiry: expiry, inviteAccepted: false,
      },
      select: USER_SELECT,
    });

    const activateUrl = `${process.env.CLIENT_URL}/accept-invite?token=${token}`;
    await dispatchEmail({
      institutionId,
      institution,
      to:      email,
      subject: `You have been invited to ${institution.name} — TIDDS Platform`,
      html:    invitationEmailHtml({ firstName, institutionName: institution.name, role, activateUrl }),
      type:    'INVITATION',
    }).catch(console.error);

    res.status(201).json(user);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email already registered' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getUser(req, res) {
  try {
    const { institutionId, userId } = req.params;
    if (req.user.role === 'INSTITUTION_ADMIN' && req.user.institutionId !== institutionId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const user = await prisma.user.findFirst({
      where:  { id: userId, institutionId },
      select: USER_SELECT,
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function updateUser(req, res) {
  try {
    const { institutionId, userId } = req.params;
    if (req.user.role === 'INSTITUTION_ADMIN' && req.user.institutionId !== institutionId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { firstName, lastName, phone, role, department, jobTitle } = req.body;
    const user = await prisma.user.update({
      where:  { id: userId },
      data:   { firstName, lastName, phone, role, department, jobTitle },
      select: USER_SELECT,
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function updateUserStatus(req, res) {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    const user = await prisma.user.update({
      where:  { id: userId },
      data:   { isActive },
      select: USER_SELECT,
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function resendInvite(req, res) {
  try {
    const { institutionId, userId } = req.params;
    const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
    const user = await prisma.user.findFirst({ where: { id: userId, institutionId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const token = generateInviteToken();
    const expiry = new Date(Date.now() + 72 * 60 * 60 * 1000);
    await prisma.user.update({ where: { id: userId }, data: { inviteToken: token, inviteExpiry: expiry } });

    const activateUrl = `${process.env.CLIENT_URL}/accept-invite?token=${token}`;
    await dispatchEmail({
      institutionId,
      institution,
      to:      user.email,
      subject: `Invitation reminder — ${institution.name} TIDDS Platform`,
      html:    invitationEmailHtml({ firstName: user.firstName, institutionName: institution.name, role: user.role, activateUrl }),
      type:    'INVITATION',
    });

    res.json({ message: 'Invitation resent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
