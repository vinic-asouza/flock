import { ChurchUserRole } from '../types';

const STRIPE_FIELDS = [
  'stripe_customer_id',
  'stripe_subscription_id',
  'subscription_status',
  'subscription_start_date',
  'subscription_end_date',
  'subscription_updated_at',
  'last_stripe_event_created',
] as const;

/**
 * Remove campos financeiros/Stripe para papéis sem permissão de billing.
 */
export function sanitizeChurchForRole<T extends Record<string, unknown>>(
  church: T,
  role: ChurchUserRole
): T {
  if (role === 'admin' || role === 'owner') {
    return church;
  }

  const copy = { ...church };
  for (const field of STRIPE_FIELDS) {
    delete copy[field];
  }
  return copy as T;
}
