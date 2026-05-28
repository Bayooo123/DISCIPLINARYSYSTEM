import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  getPanelDashboard,
  getPanelCases,
  getPanelCaseById,
  recordVerdict,
  ratifyVerdict,
  rejectRatification,
} from '../controllers/panel.controller.js';

const router = Router();

function requirePanelMember(req, res, next) {
  if (req.user.role !== 'PANEL_MEMBER') return res.status(403).json({ error: 'Panel member access required' });
  next();
}

router.get('/dashboard',     requireAuth, requirePanelMember, getPanelDashboard);
router.get('/cases',         requireAuth, requirePanelMember, getPanelCases);
router.get('/cases/:id',     requireAuth, requirePanelMember, getPanelCaseById);
router.post('/cases/:id/verdict',          requireAuth, requirePanelMember, recordVerdict);
router.post('/cases/:id/verdict/ratify',   requireAuth, requirePanelMember, ratifyVerdict);
router.post('/cases/:id/verdict/reject',   requireAuth, requirePanelMember, rejectRatification);

export default router;
