// server/src/middleware/rateLimit.ts
import type { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests per window per IP */
  max: number;
  /** Custom error message (optional) */
  message?: string;
}

interface HitEntry {
  count: number;
  resetAt: number;
}

/**
 * Simple in-memory fixed-window rate limiter.
 *
 * Suitable for single-instance deployments (Render free plan).
 * For multi-instance setups, replace with Redis-backed rate limiting.
 *
 * Usage:
 *   app.use('/api/', rateLimit({ windowMs: 60_000, max: 100 }));
 *   app.post('/api/contact', rateLimit({ windowMs: 60_000, max: 3 }), handler);
 */
export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, message } = options;
  const hits = new Map<string, HitEntry>();

  // Periodic cleanup to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now > entry.resetAt) {
        hits.delete(key);
      }
    }
  }, Math.max(windowMs * 2, 60_000));

  // Don't prevent Node process from exiting
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    // Use X-Forwarded-For if behind a proxy (Render uses a proxy)
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';

    const now = Date.now();
    const entry = hits.get(ip);

    // New window or expired window
    if (!entry || now > entry.resetAt) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    // Within window — check limit
    if (entry.count >= max) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.status(429).json({
        error:
          message ||
          'Too many requests. Please wait a moment and try again.',
      });
      return;
    }

    // Increment and continue
    entry.count++;
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(max - entry.count));
    next();
  };
    }
