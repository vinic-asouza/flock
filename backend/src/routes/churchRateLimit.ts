import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';

export const CHURCH_RATE_WINDOW_MS = 15 * 60 * 1000;
export const CHURCH_READ_MAX = 600;
export const CHURCH_WRITE_MAX = 40;

export function createChurchReadLimiter(max = CHURCH_READ_MAX): RateLimitRequestHandler {
  return rateLimit({
    windowMs: CHURCH_RATE_WINDOW_MS,
    max,
    skip: (req) => req.method !== 'GET' && req.method !== 'HEAD',
    message: {
      error: 'Muitas consultas na igreja',
      details: 'Você excedeu o limite de consultas. Tente novamente em 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
}

export function createChurchWriteLimiter(max = CHURCH_WRITE_MAX): RateLimitRequestHandler {
  return rateLimit({
    windowMs: CHURCH_RATE_WINDOW_MS,
    max,
    skip: (req) => req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS',
    message: {
      error: 'Muitas operações na igreja',
      details: 'Você excedeu o limite de operações. Tente novamente em 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
}

export const churchReadLimiter = createChurchReadLimiter();
export const churchWriteLimiter = createChurchWriteLimiter();
