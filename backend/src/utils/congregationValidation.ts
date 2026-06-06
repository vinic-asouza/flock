import { supabaseAdmin as supabase } from '../services/supabase';

export async function validateCongregationBelongsToChurch(
  congregationId: string,
  churchId: string
): Promise<{ valid: true } | { valid: false; message: string }> {
  const { data, error } = await supabase
    .from('congregations')
    .select('id')
    .eq('id', congregationId)
    .eq('church_id', churchId)
    .eq('active', true)
    .single();

  if (error || !data) {
    return { valid: false, message: 'A congregação informada não pertence a esta igreja.' };
  }

  return { valid: true };
}
