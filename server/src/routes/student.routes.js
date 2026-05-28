import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireStudentAuth } from '../middleware/studentAuth.middleware.js';
import { validateToken, getMe } from '../controllers/studentAuth.controller.js';
import { getStudentCases, getStudentCaseById, submitStudentResponse, getStudentEvidence } from '../controllers/studentCases.controller.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const tokenLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const UPLOAD_DIR = process.env.VERCEL
  ? '/tmp/uploads'
  : path.resolve(__dirname, '../../../uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const router = Router();

// Auth
router.post('/auth/validate-token', tokenLimiter, validateToken);
router.get('/auth/me', requireStudentAuth, getMe);

// Cases
router.get('/cases', requireStudentAuth, getStudentCases);
router.get('/cases/:id', requireStudentAuth, getStudentCaseById);
router.post('/cases/:id/response', requireStudentAuth, upload.array('evidence', 5), submitStudentResponse);
router.get('/cases/:id/evidence', requireStudentAuth, getStudentEvidence);

export default router;
