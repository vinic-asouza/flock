import client from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'flock_' });

export const stripeWebhookTotal = new client.Counter({
  name: 'stripe_webhook_total',
  help: 'Total de webhooks Stripe processados',
  labelNames: ['outcome'],
  registers: [register],
});

export const stripeWebhookDuration = new client.Histogram({
  name: 'stripe_webhook_duration_seconds',
  help: 'Duração do processamento de webhooks Stripe',
  labelNames: ['outcome'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [register],
});

export const stripeCheckoutCreatedTotal = new client.Counter({
  name: 'stripe_checkout_created_total',
  help: 'Sessões de checkout Stripe criadas',
  labelNames: ['plan', 'authenticated'],
  registers: [register],
});

export const stripeSyncTotal = new client.Counter({
  name: 'stripe_sync_subscription_total',
  help: 'Chamadas de sync-subscription',
  labelNames: ['outcome'],
  registers: [register],
});

export const churchSubscriptionEventInsertFailedTotal = new client.Counter({
  name: 'church_subscription_events_insert_failed_total',
  help: 'Falhas ao inserir church_subscription_events',
  registers: [register],
});

export const registerSubscriptionLinkFailedTotal = new client.Counter({
  name: 'register_subscription_link_failed_total',
  help: 'Falhas ao vincular assinatura pendente no registro',
  registers: [register],
});

export function recordWebhookMetrics(outcome: string, durationMs: number): void {
  stripeWebhookTotal.inc({ outcome });
  stripeWebhookDuration.observe({ outcome }, durationMs / 1000);
}

export function recordCheckoutCreated(plan: string, authenticated: boolean): void {
  stripeCheckoutCreatedTotal.inc({ plan, authenticated: authenticated ? 'true' : 'false' });
}

export function recordSyncSubscription(outcome: string): void {
  stripeSyncTotal.inc({ outcome });
}

export function recordSubscriptionEventInsertFailed(): void {
  churchSubscriptionEventInsertFailedTotal.inc();
}

export function recordSubscriptionLinkFailed(): void {
  registerSubscriptionLinkFailedTotal.inc();
}

export async function getMetricsText(): Promise<string> {
  return register.metrics();
}

export function getMetricsContentType(): string {
  return register.contentType;
}
