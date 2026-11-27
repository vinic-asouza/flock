import { getHttpLatencySummaries } from './httpLatency';

export type HttpLatencyRoutePayload = {
  method: string;
  route: string;
  status_code: string;
  count: number;
  p50_ms: number | null;
  p95_ms: number | null;
};

export type HttpLatencyPayload = {
  window: 'process_uptime';
  note: string;
  generated_at: string;
  uptime_seconds: number;
  route_count: number;
  routes: HttpLatencyRoutePayload[];
};

const LATENCY_NOTE =
  'Percentis desde o último restart/deploy do processo (até 2000 amostras/rota). Para janela 24h contínua, scrapar GET /metrics (Prometheus) com retenção externa.';

/**
 * Snapshot p50/p95 por rota (mesmo payload de /api/internal/http-latency e /api/ops/http-latency).
 */
export function buildHttpLatencyPayload(limit = 50): HttpLatencyPayload {
  const routes = getHttpLatencySummaries();
  const top = routes.slice(0, Math.max(0, limit));

  return {
    window: 'process_uptime',
    note: LATENCY_NOTE,
    generated_at: new Date().toISOString(),
    uptime_seconds: Math.round(process.uptime()),
    route_count: routes.length,
    routes: top.map((r) => ({
      method: r.method,
      route: r.route,
      status_code: r.status_code,
      count: r.count,
      p50_ms: r.p50_seconds === null ? null : Math.round(r.p50_seconds * 1000),
      p95_ms: r.p95_seconds === null ? null : Math.round(r.p95_seconds * 1000),
    })),
  };
}
