import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole, requireSameInstitution } from '../middleware/role.middleware.js';
import {
  listOffenceTypes, createOffenceType, updateOffenceType, deleteOffenceType,
} from '../controllers/offenceTypes.controller.js';

const router = Router({ mergeParams: true });

const guard = [requireAuth, requireRole(['PLATFORM_ADMIN', 'INSTITUTION_ADMIN']), requireSameInstitution];

router.get('/',       ...guard, listOffenceTypes);
router.post('/',      ...guard, createOffenceType);
router.patch('/:id',  ...guard, updateOffenceType);
router.delete('/:id', ...guard, deleteOffenceType);

export default router;
