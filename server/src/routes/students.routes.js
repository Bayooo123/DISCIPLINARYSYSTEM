import { Router } from 'express';
import { requireAuth as authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { sisLookup } from '../controllers/students.controller.js';

const router = Router();

const officerRoles = ['COMPLAINTS_OFFICER', 'INSTITUTION_ADMIN', 'COMMITTEE_MEMBER', 'PLATFORM_ADMIN'];

router.get('/lookup/:matricNumber', authenticate, requireRole(officerRoles), sisLookup);

export default router;
