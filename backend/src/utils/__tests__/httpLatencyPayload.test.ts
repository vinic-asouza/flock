import {
  _resetHttpLatencySamplesForTests,
  recordHttpRequestDuration,
} from '../httpLatency';
import { buildHttpLatencyPayload } from '../httpLatencyPayload';

describe('buildHttpLatencyPayload', () => {
  beforeEach(() => {
    _resetHttpLatencySamplesForTests();
  });

  it('maps samples to ms and caps routes', () => {
    for (let i = 0; i < 4; i += 1) {
      recordHttpRequestDuration({
        method: 'GET',
        route: '/health',
        statusCode: 200,
        durationSeconds: 0.25,
      });
    }

    const payload = buildHttpLatencyPayload(10);
    expect(payload.window).toBe('process_uptime');
    expect(payload.route_count).toBe(1);
    expect(payload.routes).toHaveLength(1);
    expect(payload.routes[0]).toMatchObject({
      method: 'GET',
      route: '/health',
      status_code: '200',
      count: 4,
      p50_ms: 250,
      p95_ms: 250,
    });
    expect(typeof payload.generated_at).toBe('string');
    expect(payload.uptime_seconds).toBeGreaterThanOrEqual(0);
  });
});
