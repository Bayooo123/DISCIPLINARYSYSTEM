import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole, requireSameInstitution } from '../middleware/role.middleware.js';
import {
  listUsers, createUser, getUser, updateUser, updateUserStatus, resendInvite,
} from '../controllers/users.controller.js';

const router = Router({ mergeParams: true });

const guard = [requireAuth, requireRole(['PLATFORM_ADMIN', 'INSTITUTION_ADMIN']), requireSameInstitution];

router.get('/',                        ...guard, listUsers);
router.post('/',                       requireAuth, requireRole(['PLATFORM_ADMIN']), createUser);
router.get('/:userId',                 ...guard, getUser);
router.patch('/:userId',               ...guard, updateUser);
router.patch('/:userId/status',        ...guard, updateUserStatus);
router.post('/:userId/resend-invite',  ...guard, resendInvite);

export default router;
