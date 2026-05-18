import { RateLimiterMemory } from 'rate-limiter-flexible';
import type { NextApiRequest, NextApiResponse } from 'next';
import logger from '@/utils/logger';

// ── General API Rate Limiter (per IP) ────────────────────────────────────────
// 120 requests per 60 seconds per IP
const generalLimiter = new RateLimiterMemory({
  points: 120,
  duration: 60,
  keyPrefix: 'api_general',
});

// ── Login Brute-Force Limiter (per IP) ───────────────────────────────────────
// 5 attempts per 15 minutes
const loginLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60 * 15,
  blockDuration: 60 * 15,
  keyPrefix: 'api_login',
});

/**
 * Get client IP from Next.js request headers.
 */
function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * General rate limiter middleware — wraps a Next.js API handler.
 */
export function withRateLimit(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const ip = getClientIp(req);
    try {
      await generalLimiter.consume(ip);
    } catch {
      logger.warn({ ip, path: req.url }, 'Rate limit exceeded');
      res.status(429).json({
        success: false,
        message: 'Too many requests. Please slow down.',
      });
      return;
    }
    return handler(req, res);
  };
}

/**
 * Strict login brute-force limiter — call inside the login handler.
 * Returns true if allowed, false + sends 429 if blocked.
 */
export async function checkLoginLimit(req: NextApiRequest, res: NextApiResponse): Promise<boolean> {
  const ip = getClientIp(req);
  try {
    await loginLimiter.consume(ip);
    return true;
  } catch (rlRejected: any) {
    const secs = Math.ceil(rlRejected.msBeforeNext / 1000);
    logger.warn({ ip }, `Brute-force blocked. Retry after ${secs}s`);
    res.status(429).json({
      success: false,
      message: `Too many login attempts. Try again in ${secs} seconds.`,
    });
    return false;
  }
}

/**
 * Reset login attempts for an IP after successful login.
 */
export async function resetLoginLimit(req: NextApiRequest): Promise<void> {
  const ip = getClientIp(req);
  await loginLimiter.delete(ip);
}
