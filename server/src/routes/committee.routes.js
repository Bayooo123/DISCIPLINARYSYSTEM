import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  getCommitteeDashboard,
  getCommitteeCases,
  getCommitteeCaseById,
  constitutePanel,
  updatePanel,
  scheduleHearing,
  recordAppearance,
  flagNonAppearance,
  fileAppeal,
  getAnalytics,
  getPanelEligibleUsers,
} from '../controllers/committee.controller.js';
import { exportCaseRecord, exportVerdictLetter } from '../controllers/pdf.controller.js';

const router = Router();

const COMMITTEE_ROLES = ['COMMITTEE_MEMBER', 'INSTITUTION_ADMIN', 'PLATFORM_ADMIN'];
const CHAIRMAN_ROLES  = ['COMMITTEE_MEMBER'];

function requireChairman(req, res, next) {
  if (!req.user.isChairman && req.user.role !== 'PLATFORM_ADMIN' && req.user.role !== 'INSTITUTION_ADMIN') {
    return res.status(403).json({ error: 'Only the Committee Chairman can perform this action' });
  }
  next();
}

router.get('/dashboard',  requireAuth, (req, res, next) => {
  if (!COMMITTEE_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
  next();
}, getCommitteeDashboard);

router.get('/cases', requireAuth, (req, res, next) => {
  if (!COMMITTEE_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
  next();
}, getCommitteeCases);

router.get('/cases/:id', requireAuth, (req, res, next) => {
  if (![...COMMITTEE_ROLES, 'PANEL_MEMBER'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
  next();
}, getCommitteeCaseById);

router.post('/cases/:id/panel', requireAuth, requireChairman, constitutePanel);
router.patch('/cases/:id/panel', requireAuth, requireChairman, updatePanel);

router.post('/cases/:id/hearing',  requireAuth, requireChairman, scheduleHearing);
router.patch('/cases/:id/hearing', requireAuth, requireChairman, scheduleHearing);

router.patch('/cases/:id/appearance',     requireAuth, (req, res, next) => {
  if (!COMMITTEE_ROLES.includes(req.user.role) && req.user.role !== 'PANEL_MEMBER') {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
}, recordAppearance);

router.patch('/cases/:id/non-appearance', requireAuth, (req, res, next) => {
  if (!COMMITTEE_ROLES.includes(req.user.role) && req.user.role !== 'PANEL_MEMBER') {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
}, flagNonAppearance);

router.patch('/cases/:id/appeal', requireAuth, (req, res, next) => {
  if (!COMMITTEE_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
  next();
}, fileAppeal);

router.get('/cases/:id/export/case-record',    requireAuth, requireChairman, exportCaseRecord);
router.get('/cases/:id/export/verdict-letter', requireAuth, requireChairman, exportVerdictLetter);

router.get('/analytics',      requireAuth, requireChairman, getAnalytics);
router.get('/eligible-users', requireAuth, (req, res, next) => {
  if (!COMMITTEE_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
  next();
}, getPanelEligibleUsers);

export default router;
