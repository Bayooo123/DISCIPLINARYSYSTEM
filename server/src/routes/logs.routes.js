import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole, requireSameInstitution } from '../middleware/role.middleware.js';
import { listLogs, listInstitutionLogs, testEmail, testSMS } from '../controllers/logs.controller.js';

const router = Router();

router.get('/',
  requireAuth, requireRole(['PLATFORM_ADMIN']),
  listLogs
);

router.get('/institution/:institutionId',
  requireAuth, requireRole(['PLATFORM_ADMIN', 'INSTITUTION_ADMIN']), requireSameInstitution,
  listInstitutionLogs
);

router.post('/test-email', requireAuth, requireRole(['PLATFORM_ADMIN']), testEmail);
router.post('/test-sms',   requireAuth, requireRole(['PLATFORM_ADMIN']), testSMS);

export default router;
