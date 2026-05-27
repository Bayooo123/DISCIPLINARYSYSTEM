import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole, requireSameInstitution } from '../middleware/role.middleware.js';
import {
  listOffenceTypes, createOffenceType, updateOffenceType, deleteOffenceType,
} from '../controllers/offenceTypes.controller.js';

const router = Router({ mergeParams: true });

const readRoles  = ['PLATFORM_ADMIN', 'INSTITUTION_ADMIN', 'COMPLAINTS_OFFICER', 'COMMITTEE_MEMBER', 'PANEL_MEMBER'];
const writeRoles = ['PLATFORM_ADMIN', 'INSTITUTION_ADMIN'];

router.get('/',
  requireAuth,
  requireRole(readRoles),
  requireSameInstitution,
  listOffenceTypes,
);
router.post('/',      requireAuth, requireRole(writeRoles), requireSameInstitution, createOffenceType);
router.patch('/:id',  requireAuth, requireRole(writeRoles), requireSameInstitution, updateOffenceType);
router.delete('/:id', requireAuth, requireRole(writeRoles), requireSameInstitution, deleteOffenceType);

export default router;
