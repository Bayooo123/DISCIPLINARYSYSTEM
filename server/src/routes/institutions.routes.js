import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import {
  listInstitutions, createInstitution, getInstitution,
  updateInstitution, deleteInstitution,
} from '../controllers/institutions.controller.js';

const router = Router();
const adminOnly = [requireAuth, requireRole(['PLATFORM_ADMIN'])];

router.get('/',     ...adminOnly, listInstitutions);
router.post('/',    ...adminOnly, createInstitution);
router.get('/:id',  ...adminOnly, getInstitution);
router.patch('/:id', ...adminOnly, updateInstitution);
router.patch('/:id/branding',     ...adminOnly, updateInstitution);
router.patch('/:id/integrations', ...adminOnly, updateInstitution);
router.patch('/:id/licence',      ...adminOnly, updateInstitution);
router.delete('/:id', ...adminOnly, deleteInstitution);

export default router;
