import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
  }
}

/**
 * Propaga ou gera X-Request-Id para correlação de logs.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const rawId =
    (typeof req.headers['x-request-id'] === 'string' && req.headers['x-request-id']) ||
    (typeof req.headers['x-correlation-id'] === 'string' && req.headers['x-correlation-id']) ||
    '';

  const requestId = rawId.trim() || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}
