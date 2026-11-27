import { Request, Response } from 'express';
import { buildHttpLatencyPayload } from '../utils/httpLatencyPayload';

/**
 * GET /api/internal/http-latency
 * Resumo p50/p95 por rota desde o último restart do processo.
 * Auth: METRICS_TOKEN.
 */
export function getHttpLatencyStats(_req: Request, res: Response): void {
  try {
    res.json(buildHttpLatencyPayload());
  } catch (err) {
    console.error('getHttpLatencyStats:', err);
    res.status(500).json({ error: 'latency_stats_error' });
  }
}
