import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export function generateInviteToken() {
  return crypto.randomBytes(32).toString('hex');
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}
