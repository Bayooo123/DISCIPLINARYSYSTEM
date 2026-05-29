import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { comparePassword, hashPassword, generateInviteToken } from '../utils/crypto.utils.js';
import { signToken } from '../utils/jwt.utils.js';

const prisma = new PrismaClient();

const SENSITIVE = {
  smtpPass: true, sisApiKey: true, smtpUser: true,
};
function stripSensitive(institution) {
  if (!institution) return institution;
  const { smtpPass, sisApiKey, ...safe } = institution;
  return safe;
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Check Reforma Admin env credentials first
    if (
      email === process.env.REFORMA_ADMIN_EMAIL &&
      password === process.env.REFORMA_ADMIN_PASSWORD
    ) {
      const token = signToken({
        userId:          'reforma-admin',
        email,
        role:            'PLATFORM_ADMIN',
        institutionId:   null,
        institutionSlug: null,
        firstName:       'Reforma',
        lastName:        'Admin',
      });
      return res.json({
        token,
        user: { id: 'reforma-admin', email, role: 'PLATFORM_ADMIN', firstName: 'Reforma', lastName: 'Admin' },
      });
    }

    const user = await prisma.user.findUnique({ where: { email }, include: { institution: true } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.inviteAccepted) {
      return res.status(403).json({ error: 'Please accept your invitation before logging in' });
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const token = signToken({
      userId:          user.id,
      email:           user.email,
      role:            user.role,
      institutionId:   user.institutionId,
      institutionSlug: user.institution?.slug || null,
      firstName:       user.firstName,
      lastName:        user.lastName,
    });

    res.json({
      token,
      user: {
        id:            user.id,
        email:         user.email,
        role:          user.role,
        firstName:     user.firstName,
        lastName:      user.lastName,
        institutionId: user.institutionId,
        institution:   user.institution ? stripSensitive(user.institution) : null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function acceptInvite(req, res) {
  try {
    const { token, password } = req.body;

    const user = await prisma.user.findFirst({
      where: { inviteToken: token, inviteExpiry: { gt: new Date() } },
    });
    if (!user) return res.status(400).json({ error: 'Invalid or expired invitation link' });

    const hash = await hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      data:  {
        passwordHash:  hash,
        inviteToken:   null,
        inviteExpiry:  null,
        inviteAccepted: true,
        lastLoginAt:   new Date(),
      },
    });

    const jwtToken = signToken({
      userId:        user.id,
      email:         user.email,
      role:          user.role,
      institutionId: user.institutionId,
      firstName:     user.firstName,
      lastName:      user.lastName,
    });

    res.json({
      token: jwtToken,
      user:  { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName, institutionId: user.institutionId },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function me(req, res) {
  try {
    if (req.user.userId === 'reforma-admin') {
      return res.json({
        id: 'reforma-admin', email: req.user.email, role: 'PLATFORM_ADMIN',
        firstName: 'Reforma', lastName: 'Admin',
      });
    }
    const user = await prisma.user.findUnique({
      where:   { id: req.user.userId },
      include: { institution: true },
      omit:    { passwordHash: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ ...user, institution: user.institution ? stripSensitive(user.institution) : null });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}
