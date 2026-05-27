import { Router } from 'express';
import { body } from 'express-validator';
import { login, acceptInvite, me } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
  login
);

router.post('/accept-invite',
  body('token').notEmpty(),
  body('password').isLength({ min: 8 }),
  validate,
  acceptInvite
);

router.get('/me', requireAuth, me);

export default router;
