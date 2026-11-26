import { Request, Response, NextFunction } from 'express';
import {
  recordHttpRequestDuration,
  resolveHttpRouteLabel,
  shouldSkipHttpLatencyPath,
} from '../utils/httpLatency';

/**
 * Registra duração HTTP no Histogram Prometheus (low-cardinality route label).
 */
export function httpLatencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const started = process.hrtime.bigint();

  res.on('finish', () => {
    try {
      const pathForSkip = req.originalUrl?.split('?')[0] || req.path || '/';
      if (shouldSkipHttpLatencyPath(pathForSkip)) return;

      const route = resolveHttpRouteLabel({
        baseUrl: req.baseUrl,
        routePath: req.route?.path,
        path: req.path,
        originalUrl: req.originalUrl,
      });

      const durationSeconds = Number(process.hrtime.bigint() - started) / 1e9;
      recordHttpRequestDuration({
        method: req.method,
        route,
        statusCode: res.statusCode,
        durationSeconds,
      });
    } catch (err) {
      console.error('httpLatencyMiddleware: falha ao registrar métrica', err);
    }
  });

  next();
}
