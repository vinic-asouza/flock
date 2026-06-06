import * as Sentry from '@sentry/nextjs';

type BillingTelemetryContext = Record<string, string | number | boolean | undefined>;

function hashChurchId(churchId?: string | null): string | undefined {
  if (!churchId) return undefined;
  let hash = 0;
  for (let i = 0; i < churchId.length; i++) {
    hash = (hash << 5) - hash + churchId.charCodeAt(i);
    hash |= 0;
  }
  return `church_${Math.abs(hash)}`;
}

export function captureBillingError(
  event: string,
  context?: BillingTelemetryContext & { church_id?: string | null }
): void {
  const safeContext: BillingTelemetryContext = {
    ...context,
    church_id: undefined,
    church_hash: hashChurchId(context?.church_id),
  };

  if (process.env.NODE_ENV === 'development') {
    console.warn(`[billing] ${event}`, safeContext);
  }

  if (!process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'false') {
    return;
  }

  Sentry.withScope((scope) => {
    scope.setTag('domain', 'billing');
    scope.setTag('billing_event', event);
    Object.entries(safeContext).forEach(([key, value]) => {
      if (value !== undefined) {
        scope.setExtra(key, value);
      }
    });
    Sentry.captureMessage(event, 'warning');
  });
}
