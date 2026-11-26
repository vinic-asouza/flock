import client from 'prom-client';
import { getMetricsRegistry } from './billingMetrics';

const register = getMetricsRegistry();

/**
 * Buckets em segundos — cobrem RTT BR↔US (~0.3–1s) até rotas pesadas.
 */
export const HTTP_LATENCY_BUCKETS_SECONDS = [
  0.05, 0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 5, 8, 13, 21,
] as const;

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duração das requisições HTTP da API por método, rota e status',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [...HTTP_LATENCY_BUCKETS_SECONDS],
  registers: [register],
});

const SKIP_PATH_PREFIXES = ['/metrics', '/api/internal/http-latency'];

/** Amostras em memória para p50/p95 JSON (complementa o Histogram Prometheus). */
const MAX_SAMPLES_PER_KEY = 2000;
const sampleBuffers = new Map<string, number[]>();

/**
 * Normaliza path para low-cardinality: UUIDs e IDs numéricos → `:id`.
 */
export function normalizeHttpRoute(pathname: string): string {
  if (!pathname || pathname === '/') return pathname || '/';

  const pathOnly = pathname.split('?')[0] || '/';
  const segments = pathOnly.split('/').map((segment) => {
    if (!segment) return segment;
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        segment
      )
    ) {
      return ':id';
    }
    if (/^\d+$/.test(segment)) {
      return ':id';
    }
    return segment;
  });

  const normalized = segments.join('/') || '/';
  return normalized.length > 120 ? `${normalized.slice(0, 117)}...` : normalized;
}

export function shouldSkipHttpLatencyPath(pathname: string): boolean {
  return SKIP_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function resolveHttpRouteLabel(input: {
  baseUrl?: string;
  routePath?: string;
  path?: string;
  originalUrl?: string;
}): string {
  if (input.routePath) {
    const base = input.baseUrl || '';
    return normalizeHttpRoute(`${base}${input.routePath}` || '/');
  }

  const raw =
    (input.path && input.path.length > 0 ? input.path : null) ||
    (input.originalUrl ? input.originalUrl.split('?')[0] : '/') ||
    '/';

  return normalizeHttpRoute(raw);
}

function sampleKey(method: string, route: string, statusCode: number): string {
  return `${method.toUpperCase()}\t${route}\t${statusCode}`;
}

function pushSample(key: string, durationSeconds: number): void {
  let buf = sampleBuffers.get(key);
  if (!buf) {
    buf = [];
    sampleBuffers.set(key, buf);
  }
  buf.push(durationSeconds);
  if (buf.length > MAX_SAMPLES_PER_KEY) {
    buf.splice(0, buf.length - MAX_SAMPLES_PER_KEY);
  }
}

export function recordHttpRequestDuration(input: {
  method: string;
  route: string;
  statusCode: number;
  durationSeconds: number;
}): void {
  const method = (input.method || 'GET').toUpperCase();
  const status = String(input.statusCode || 0);
  const duration = Math.max(0, input.durationSeconds);
  httpRequestDuration.observe(
    { method, route: input.route, status_code: status },
    duration
  );
  pushSample(sampleKey(method, input.route, input.statusCode || 0), duration);
}

type BucketSample = { le: number; count: number };

/**
 * Quantil linear a partir de buckets cumulativos estilo Prometheus.
 */
export function quantileFromHistogramBuckets(
  buckets: BucketSample[],
  q: number
): number | null {
  if (!buckets.length || q < 0 || q > 1) return null;

  const sorted = [...buckets].sort((a, b) => a.le - b.le);
  const total = sorted[sorted.length - 1]?.count ?? 0;
  if (total <= 0) return null;

  const rank = q * total;
  let prevLe = 0;
  let prevCount = 0;

  for (const bucket of sorted) {
    if (bucket.count >= rank) {
      const countInBucket = bucket.count - prevCount;
      if (countInBucket <= 0 || !Number.isFinite(bucket.le)) {
        return Number.isFinite(bucket.le) ? bucket.le : prevLe;
      }
      const rankInBucket = rank - prevCount;
      const width = bucket.le - prevLe;
      return prevLe + (rankInBucket / countInBucket) * width;
    }
    prevLe = Number.isFinite(bucket.le) ? bucket.le : prevLe;
    prevCount = bucket.count;
  }

  return prevLe;
}

/** Quantil a partir de amostras brutas (segundos). */
export function quantileFromSamples(
  samples: number[],
  q: number
): number | null {
  if (!samples.length || q < 0 || q > 1) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  const weight = pos - lo;
  return sorted[lo] * (1 - weight) + sorted[hi] * weight;
}

export type HttpLatencyRouteSummary = {
  method: string;
  route: string;
  status_code: string;
  count: number;
  p50_seconds: number | null;
  p95_seconds: number | null;
};

/** @internal testes */
export function _resetHttpLatencySamplesForTests(): void {
  sampleBuffers.clear();
}

/**
 * p50/p95 por rota a partir do buffer em memória (desde o restart).
 */
export function getHttpLatencySummaries(): HttpLatencyRouteSummary[] {
  const summaries: HttpLatencyRouteSummary[] = [];

  for (const [key, samples] of sampleBuffers.entries()) {
    const [method, route, status_code] = key.split('\t');
    summaries.push({
      method,
      route,
      status_code,
      count: samples.length,
      p50_seconds: quantileFromSamples(samples, 0.5),
      p95_seconds: quantileFromSamples(samples, 0.95),
    });
  }

  return summaries.sort(
    (a, b) => b.count - a.count || a.route.localeCompare(b.route)
  );
}
