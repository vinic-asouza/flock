import {
  _resetHttpLatencySamplesForTests,
  getHttpLatencySummaries,
  normalizeHttpRoute,
  quantileFromHistogramBuckets,
  quantileFromSamples,
  recordHttpRequestDuration,
  resolveHttpRouteLabel,
  shouldSkipHttpLatencyPath,
} from '../httpLatency';

describe('normalizeHttpRoute', () => {
  it('replaces UUIDs and numeric ids', () => {
    expect(
      normalizeHttpRoute(
        '/api/members/a1b2c3d4-e5f6-4789-a012-3456789abcde/profile'
      )
    ).toBe('/api/members/:id/profile');
    expect(normalizeHttpRoute('/api/members/42')).toBe('/api/members/:id');
  });

  it('keeps static segments', () => {
    expect(normalizeHttpRoute('/api/refresh/check')).toBe('/api/refresh/check');
    expect(normalizeHttpRoute('/health')).toBe('/health');
  });
});

describe('resolveHttpRouteLabel', () => {
  it('prefers Express route path + baseUrl', () => {
    expect(
      resolveHttpRouteLabel({
        baseUrl: '/api/members',
        routePath: '/:id',
        path: '/a1b2c3d4-e5f6-4789-a012-3456789abcde',
      })
    ).toBe('/api/members/:id');
  });
});

describe('shouldSkipHttpLatencyPath', () => {
  it('skips metrics endpoints', () => {
    expect(shouldSkipHttpLatencyPath('/metrics')).toBe(true);
    expect(shouldSkipHttpLatencyPath('/api/internal/http-latency')).toBe(true);
    expect(shouldSkipHttpLatencyPath('/health')).toBe(false);
  });
});

describe('quantileFromSamples', () => {
  it('returns null for empty', () => {
    expect(quantileFromSamples([], 0.5)).toBeNull();
  });

  it('computes median and p95', () => {
    const samples = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    expect(quantileFromSamples(samples, 0.5)).toBeCloseTo(0.55, 5);
    expect(quantileFromSamples(samples, 0.95)).toBeCloseTo(0.955, 5);
  });
});

describe('quantileFromHistogramBuckets', () => {
  it('interpolates within a bucket', () => {
    const buckets = [
      { le: 0.1, count: 0 },
      { le: 0.5, count: 5 },
      { le: 1, count: 10 },
      { le: Infinity, count: 10 },
    ];
    expect(quantileFromHistogramBuckets(buckets, 0.5)).toBeCloseTo(0.5, 5);
  });
});

describe('getHttpLatencySummaries', () => {
  beforeEach(() => {
    _resetHttpLatencySamplesForTests();
  });

  it('aggregates recorded samples', () => {
    for (let i = 0; i < 10; i += 1) {
      recordHttpRequestDuration({
        method: 'GET',
        route: '/health',
        statusCode: 200,
        durationSeconds: 0.1 * (i + 1),
      });
    }

    const summaries = getHttpLatencySummaries();
    expect(summaries).toHaveLength(1);
    expect(summaries[0].route).toBe('/health');
    expect(summaries[0].count).toBe(10);
    expect(summaries[0].p50_seconds).not.toBeNull();
    expect(summaries[0].p95_seconds).not.toBeNull();
  });
});
