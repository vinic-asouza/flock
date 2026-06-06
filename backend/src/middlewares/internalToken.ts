import { Request, Response, NextFunction } from 'express';

/**
 * Protege rotas internas com token via header ou query.
 * Env: INTERNAL_BILLING_TOKEN ou METRICS_TOKEN (fallback).
 */
export function requireInternalToken(envKey: 'INTERNAL_BILLING_TOKEN' | 'METRICS_TOKEN') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const expected = process.env[envKey];
    if (!expected) {
      if (process.env.NODE_ENV !== 'production') {
        next();
        return;
      }
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const provided =
      (typeof req.headers['x-internal-token'] === 'string' && req.headers['x-internal-token']) ||
      (typeof req.query.token === 'string' && req.query.token);

    if (provided !== expected) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    next();
  };
}
