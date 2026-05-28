import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import authRoutes         from './routes/auth.routes.js';
import institutionRoutes  from './routes/institutions.routes.js';
import userRoutes         from './routes/users.routes.js';
import offenceTypeRoutes  from './routes/offenceTypes.routes.js';
import dashboardRoutes    from './routes/dashboard.routes.js';
import logRoutes          from './routes/logs.routes.js';
import casesRoutes        from './routes/cases.routes.js';
import studentsRoutes     from './routes/students.routes.js';
import studentRoutes      from './routes/student.routes.js';
import committeeRoutes    from './routes/committee.routes.js';
import panelRoutes        from './routes/panel.routes.js';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.STUDENT_PORTAL_URL,
].filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const uploadDir = process.env.VERCEL
  ? '/tmp/uploads'
  : path.resolve(__dirname, '../../uploads');
app.use('/uploads', express.static(uploadDir));

app.use('/api/auth',                                  authRoutes);
app.use('/api/institutions',                          institutionRoutes);
app.use('/api/institutions/:institutionId/users',     userRoutes);
app.use('/api/institutions/:institutionId/offence-types', offenceTypeRoutes);
app.use('/api/dashboard',                             dashboardRoutes);
app.use('/api/logs',                                  logRoutes);
app.use('/api/cases',                                 casesRoutes);
app.use('/api/students',                              studentsRoutes);
app.use('/api/student',                               studentRoutes);
app.use('/api/committee',                             committeeRoutes);
app.use('/api/panel',                                 panelRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
