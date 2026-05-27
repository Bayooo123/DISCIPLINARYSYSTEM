import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole, requireSameInstitution } from '../middleware/role.middleware.js';
import { reformaDashboard, institutionDashboard } from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/reforma',
  requireAuth, requireRole(['PLATFORM_ADMIN']),
  reformaDashboard
);

router.get('/institution/:institutionId',
  requireAuth, requireRole(['PLATFORM_ADMIN', 'INSTITUTION_ADMIN']), requireSameInstitution,
  institutionDashboard
);

export default router;
