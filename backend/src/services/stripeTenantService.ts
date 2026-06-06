import { supabaseAdmin } from './supabase';

/**
 * Garante que o customer da sessão de checkout pode ser vinculado à igreja.
 */
export async function assertCheckoutCustomerMatchesChurch(
  churchId: string,
  customerId: string
): Promise<void> {
  const { data: church, error } = await supabaseAdmin
    .from('churches')
    .select('id, stripe_customer_id')
    .eq('id', churchId)
    .single();

  if (error || !church) {
    throw new Error(`Igreja não encontrada para checkout: ${churchId}`);
  }

  if (church.stripe_customer_id && church.stripe_customer_id !== customerId) {
    throw new Error(
      `Customer ${customerId} não corresponde ao customer da igreja ${churchId}`
    );
  }

  const { data: otherChurch } = await supabaseAdmin
    .from('churches')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .neq('id', churchId)
    .maybeSingle();

  if (otherChurch) {
    throw new Error(
      `Customer ${customerId} já está vinculado à igreja ${otherChurch.id}`
    );
  }
}
