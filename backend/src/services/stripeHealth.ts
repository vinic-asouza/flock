import { stripe } from './stripe';
import { supabaseAdmin } from './supabase';
import {
  STRIPE_HEALTH_TIMEOUT_MS,
  stripeComponentStatus,
  type OpsHealthStatus,
} from '../utils/opsHealth';
import { withTimeout } from '../utils/withTimeout';

export interface StripeHealthSnapshot {
  status: OpsHealthStatus;
  stripe_configured: boolean;
  stripe_reachable: boolean;
  last_webhook_processed_at: string | null;
}

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.STRIPE_PRICE_ID_M200 &&
      process.env.STRIPE_PRICE_ID_M500 &&
      process.env.STRIPE_PRICE_ID_M800
  );
}

async function fetchLastWebhookProcessedAt(): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('processed_webhook_events')
      .select('processed_at')
      .order('processed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return null;
    }

    return data?.processed_at ?? null;
  } catch {
    return null;
  }
}

export async function getStripeHealthSnapshot(): Promise<StripeHealthSnapshot> {
  const stripe_configured = isStripeConfigured();
  if (!stripe_configured) {
    return {
      status: 'error',
      stripe_configured: false,
      stripe_reachable: false,
      last_webhook_processed_at: null,
    };
  }

  let stripe_reachable = false;
  try {
    await withTimeout(
      stripe.balance.retrieve(),
      STRIPE_HEALTH_TIMEOUT_MS,
      'stripe_health_timeout'
    );
    stripe_reachable = true;
  } catch {
    stripe_reachable = false;
  }

  const last_webhook_processed_at = await fetchLastWebhookProcessedAt();

  return {
    status: stripeComponentStatus(true, stripe_reachable),
    stripe_configured: true,
    stripe_reachable,
    last_webhook_processed_at,
  };
}
