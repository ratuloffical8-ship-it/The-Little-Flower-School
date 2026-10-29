// server/src/index.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import './config/firebase';
import { rateLimit } from './middleware/rateLimit';
import {
  verifyAppCheck,
  APP_CHECK_PROTECTED_PATHS,
  APP_CHECK_HEADER,
} from './middleware/appCheck';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import admissionRoutes from './routes/admission';
import noticesRoutes from './routes/notices';
import galleryRoutes from './routes/gallery';
import faqRoutes from './routes/faq';
import contactRoutes from './routes/contact';
import paymentsRoutes from './routes/payments';
import studentsRoutes from './routes/students';
import teachersRoutes from './routes/teachers';
import attendanceRoutes from './routes/attendance';
import examsRoutes from './routes/exams';
import resultsRoutes from './routes/results';
import reportsRoutes from './routes/reports';
import expensesRoutes from './routes/expenses';
import settingsRoutes from './routes/settings';
import usersRoutes from './routes/users';
import publicRoutes from './routes/public';

const app = express();

// Render sits behind a proxy: trust it so req.ip is the real client IP
// (otherwise every visitor shares one rate-limit bucket).
app.set('trust proxy', 1);

// ── Security Headers ────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // API-only, no HTML served
    crossOriginEmbedderPolicy: false,
  })
);

// ── CORS ────────────────────────────────────────────────────────────
const allowedOrigins = env.FRONTEND_ORIGIN.split(',').map((o) => o.trim());

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (server-to-server, health checks)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', APP_CHECK_HEADER],
    credentials: true,
    maxAge: 86400,
  })
);

// ── Health Check (before body parsing and rate limit; fast for Render) ──
app.use('/api/health', healthRoutes);

// ── Body Parsing ────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Global Rate Limit ───────────────────────────────────────────────
app.use('/api/', rateLimit({ windowMs: 60_000, max: 120 }));

// ── App Check on public POST endpoints (no-op unless enforced) ──────
app.post(APP_CHECK_PROTECTED_PATHS, verifyAppCheck);

// ── API Routes ──────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/admission', admissionRoutes);
app.use('/api/notices', noticesRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/faq', faqRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/settings', publicRoutes); // MUST come before the admin settings router
app.use('/api/settings', settingsRoutes);
app.use('/api/users', usersRoutes);

// ── 404 + Global Error Handler (must be last) ───────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Start Server ────────────────────────────────────────────────────
app.listen(env.PORT, () => {
  console.log(
    `[TLFS] Server running on port ${env.PORT} (${env.NODE_ENV})`
  );
});

export default app;
