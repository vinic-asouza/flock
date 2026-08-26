import {
  OPS_HEALTH_ERROR_MESSAGE_MAX,
  OPS_HEALTH_JOB_NAMES,
  billingJobsComponentStatus,
  emptyJobSnapshot,
  overallOpsHealthStatus,
  stripeComponentStatus,
  truncateErrorMessage,
} from '../opsHealth';

describe('stripeComponentStatus', () => {
  it('should be error when Stripe is not configured', () => {
    expect(stripeComponentStatus(false, false)).toBe('error');
    expect(stripeComponentStatus(false, true)).toBe('error');
  });

  it('should be degraded when configured but unreachable', () => {
    expect(stripeComponentStatus(true, false)).toBe('degraded');
  });

  it('should be ok when configured and reachable', () => {
    expect(stripeComponentStatus(true, true)).toBe('ok');
  });
});

describe('billingJobsComponentStatus', () => {
  it('should be error when any last run failed', () => {
    expect(
      billingJobsComponentStatus([
        { last_status: 'success' },
        { last_status: 'failed' },
        { last_status: null },
      ])
    ).toBe('error');
  });

  it('should be degraded when a job never ran', () => {
    expect(
      billingJobsComponentStatus([
        { last_status: 'success' },
        { last_status: null },
      ])
    ).toBe('degraded');
  });

  it('should be degraded when a job is still running', () => {
    expect(
      billingJobsComponentStatus([
        { last_status: 'success' },
        { last_status: 'running' },
      ])
    ).toBe('degraded');
  });

  it('should be ok when every known job succeeded', () => {
    expect(
      billingJobsComponentStatus(OPS_HEALTH_JOB_NAMES.map(() => ({ last_status: 'success' })))
    ).toBe('ok');
  });
});

describe('overallOpsHealthStatus', () => {
  it('should prefer error over degraded and ok', () => {
    expect(overallOpsHealthStatus(['ok', 'error', 'degraded'])).toBe('error');
  });

  it('should prefer degraded over ok', () => {
    expect(overallOpsHealthStatus(['ok', 'degraded'])).toBe('degraded');
  });

  it('should be ok when every component is ok', () => {
    expect(overallOpsHealthStatus(['ok', 'ok', 'ok'])).toBe('ok');
  });
});

describe('truncateErrorMessage', () => {
  it('should return null for empty values', () => {
    expect(truncateErrorMessage(null)).toBeNull();
    expect(truncateErrorMessage(undefined)).toBeNull();
    expect(truncateErrorMessage('   ')).toBeNull();
  });

  it('should keep short messages', () => {
    expect(truncateErrorMessage('job failed')).toBe('job failed');
  });

  it('should cap long messages', () => {
    const long = 'x'.repeat(OPS_HEALTH_ERROR_MESSAGE_MAX + 40);
    const truncated = truncateErrorMessage(long);
    expect(truncated).toHaveLength(OPS_HEALTH_ERROR_MESSAGE_MAX);
    expect(truncated).toBe('x'.repeat(OPS_HEALTH_ERROR_MESSAGE_MAX));
  });
});

describe('emptyJobSnapshot', () => {
  it('should always expose the five known jobs with null last_status', () => {
    expect(OPS_HEALTH_JOB_NAMES).toHaveLength(5);
    const jobs = OPS_HEALTH_JOB_NAMES.map((name) => emptyJobSnapshot(name));
    expect(jobs.map((job) => job.job_name)).toEqual([...OPS_HEALTH_JOB_NAMES]);
    expect(jobs.every((job) => job.last_status === null)).toBe(true);
    expect(billingJobsComponentStatus(jobs)).toBe('degraded');
  });
});
