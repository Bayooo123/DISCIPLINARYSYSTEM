import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes         from './routes/auth.routes.js';
import institutionRoutes  from './routes/institutions.routes.js';
import userRoutes         from './routes/users.routes.js';
import offenceTypeRoutes  from './routes/offenceTypes.routes.js';
import dashboardRoutes    from './routes/dashboard.routes.js';
import logRoutes          from './routes/logs.routes.js';

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth',                                  authRoutes);
app.use('/api/institutions',                          institutionRoutes);
app.use('/api/institutions/:institutionId/users',     userRoutes);
app.use('/api/institutions/:institutionId/offence-types', offenceTypeRoutes);
app.use('/api/dashboard',                             dashboardRoutes);
app.use('/api/logs',                                  logRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
