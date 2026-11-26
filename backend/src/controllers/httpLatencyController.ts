import { Request, Response } from 'express';
import { getHttpLatencySummaries } from '../utils/httpLatency';

/**
 * GET /api/internal/http-latency
 * Resumo p50/p95 por rota desde o último restart do processo.
 */
export function getHttpLatencyStats(_req: Request, res: Response): void {
  try {
    const routes = getHttpLatencySummaries();
    const top = routes.slice(0, 50);

    res.json({
      window: 'process_uptime',
      note:
        'Percentis desde o último restart/deploy do processo (até 2000 amostras/rota). Para janela 24h contínua, scrapar GET /metrics (Prometheus) com retenção externa.',
      generated_at: new Date().toISOString(),
      uptime_seconds: Math.round(process.uptime()),
      route_count: routes.length,
      routes: top.map((r) => ({
        method: r.method,
        route: r.route,
        status_code: r.status_code,
        count: r.count,
        p50_ms:
          r.p50_seconds === null ? null : Math.round(r.p50_seconds * 1000),
        p95_ms:
          r.p95_seconds === null ? null : Math.round(r.p95_seconds * 1000),
      })),
    });
  } catch (err) {
    console.error('getHttpLatencyStats:', err);
    res.status(500).json({ error: 'latency_stats_error' });
  }
}
