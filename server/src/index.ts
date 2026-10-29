// server/src/index.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import './config/firebase';
import { rateLimit } from './middleware/rateLimit';

const app = express();

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
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  })
);

// ── Body Parsing ────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Global Rate Limit ───────────────────────────────────────────────
app.use('/api/', rateLimit({ windowMs: 60_000, max: 120 }));

// ── Health Check (must be fast for Render cold-start) ───────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes (added in subsequent batches) ────────────────────────
// import admissionRoutes from './routes/admission';
// import authRoutes from './routes/auth';
// import resultsRoutes from './routes/results';
// import noticesRoutes from './routes/notices';
// import paymentsRoutes from './routes/payments';
// import galleryRoutes from './routes/gallery';
// import faqRoutes from './routes/faq';
// import contactRoutes from './routes/contact';
// import adminRoutes from './routes/admin';
//
// app.use('/api/auth', authRoutes);
// app.use('/api/admission', admissionRoutes);
// app.use('/api/results', resultsRoutes);
// app.use('/api/notices', noticesRoutes);
// app.use('/api/payments', paymentsRoutes);
// app.use('/api/gallery', galleryRoutes);
// app.use('/api/faq', faqRoutes);
// app.use('/api/contact', contactRoutes);
// app.use('/api/admin', adminRoutes);

// ── 404 Handler ─────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global Error Handler ────────────────────────────────────────────
app.use(
  (
    err: Error & { status?: number },
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    const status = err.status || 500;
    const message =
      env.NODE_ENV === 'production' && status === 500
        ? 'Internal server error'
        : err.message;

    if (status === 500) {
      console.error('[ERROR]', err);
    }

    res.status(status).json({ error: message });
  }
);

// ── Start Server ────────────────────────────────────────────────────
app.listen(env.PORT, () => {
  console.log(
    `[TLFS] Server running on port ${env.PORT} (${env.NODE_ENV})`
  );
});

export default app;
