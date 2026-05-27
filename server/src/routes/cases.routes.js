import { Router } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth as authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import {
  fileComplaint,
  getMyCases,
  getCaseById,
  uploadEvidence,
  getEvidence,
  getOfficerDashboard,
} from '../controllers/cases.controller.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const storage = multer.diskStorage({
  destination: path.resolve(__dirname, '../../../uploads'),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4', 'audio/mpeg', 'audio/wav'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const officerRoles = ['COMPLAINTS_OFFICER', 'INSTITUTION_ADMIN', 'COMMITTEE_MEMBER', 'PLATFORM_ADMIN'];

const router = Router();

router.get('/dashboard', authenticate, requireRole(officerRoles), getOfficerDashboard);
router.get('/', authenticate, requireRole(officerRoles), getMyCases);
router.post('/',
  authenticate,
  requireRole(['COMPLAINTS_OFFICER', 'INSTITUTION_ADMIN']),
  [
    body('matricNumber').notEmpty().withMessage('Matric number is required'),
    body('offenceTypeIds').isArray({ min: 1 }).withMessage('At least one offence type is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('incidentDate').isISO8601().withMessage('Valid incident date is required'),
  ],
  fileComplaint,
);
router.get('/:id', authenticate, requireRole(officerRoles), getCaseById);
router.post('/:id/evidence', authenticate, requireRole(officerRoles), upload.array('files', 5), uploadEvidence);
router.get('/:id/evidence', authenticate, requireRole(officerRoles), getEvidence);

export default router;
