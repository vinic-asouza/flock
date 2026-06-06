/**
 * Logs estruturados JSON para eventos de billing/Stripe.
 * Sempre emitidos (incluindo produção) — distinto de debug/info do logger.ts.
 */

export type BillingLogOutcome =
  | 'success'
  | 'duplicate'
  | 'ignored'
  | 'infra_error'
  | 'failed'
  | 'skipped'
  | 'degraded';

export interface BillingLogFields {
  event: string;
  stripe_event_id?: string;
  stripe_event_type?: string;
  church_id?: string;
  customer_id?: string;
  session_id?: string;
  duration_ms?: number;
  outcome?: BillingLogOutcome;
  request_id?: string;
  error?: string;
  [key: string]: unknown;
}

function writeBillingLog(level: 'info' | 'warn' | 'error', fields: BillingLogFields): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    domain: 'billing',
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

/** Log estruturado de billing — visível em todos os ambientes. */
export function billingLog(fields: BillingLogFields): void {
  writeBillingLog('info', fields);
}

export function billingWarn(fields: BillingLogFields): void {
  writeBillingLog('warn', fields);
}

export function billingError(fields: BillingLogFields): void {
  writeBillingLog('error', fields);
}
