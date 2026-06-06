import * as Sentry from '@sentry/node';

let initialized = false;

export function initSentryBilling(): void {
  const dsn = process.env.SENTRY_DSN;
  if (initialized || !dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
    enabled: process.env.SENTRY_ENABLED !== 'false',
  });
  initialized = true;
}

export function captureBillingException(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (!process.env.SENTRY_DSN || process.env.SENTRY_ENABLED === 'false') return;

  Sentry.withScope((scope) => {
    scope.setTag('domain', 'billing');
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureException(error);
  });
}

export function captureBillingMessage(
  message: string,
  context?: Record<string, unknown>
): void {
  if (!process.env.SENTRY_DSN || process.env.SENTRY_ENABLED === 'false') return;

  Sentry.withScope((scope) => {
    scope.setTag('domain', 'billing');
    scope.setLevel('warning');
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureMessage(message);
  });
}
