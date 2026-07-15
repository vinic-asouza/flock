import { supabaseAdmin as supabase } from '../services/supabase';
import { logError } from './logger';

export type PrimaryCongregation = {
  id: string;
  church_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  is_primary: boolean;
};

type ChurchSeed = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
};

/**
 * Retorna a congregação principal da igreja.
 */
export async function getPrimaryCongregation(
  churchId: string
): Promise<PrimaryCongregation | null> {
  const { data, error } = await supabase
    .from('congregations')
    .select('id, church_id, name, address, city, state, is_primary')
    .eq('church_id', churchId)
    .eq('is_primary', true)
    .maybeSingle();

  if (error) {
    logError('Erro ao buscar congregação principal:', error);
    return null;
  }

  return data as PrimaryCongregation | null;
}

/**
 * Cria a congregação principal a partir dos dados da igreja (onboarding).
 */
export async function createPrimaryCongregationForChurch(
  church: ChurchSeed
): Promise<{ data: PrimaryCongregation | null; error: string | null }> {
  const { data, error } = await supabase
    .from('congregations')
    .insert([
      {
        church_id: church.id,
        name: church.name.trim(),
        address: church.address.trim(),
        city: church.city.trim(),
        state: church.state.trim().toUpperCase(),
        is_primary: true,
      },
    ])
    .select('id, church_id, name, address, city, state, is_primary')
    .single();

  if (error || !data) {
    logError('Erro ao criar congregação principal:', error);
    return {
      data: null,
      error: error?.message || 'Não foi possível criar a congregação principal',
    };
  }

  return { data: data as PrimaryCongregation, error: null };
}

/**
 * Resolve filtro de congregação: rejeita sentinel legado `sede`.
 * Retorna undefined quando não há filtro (todas).
 */
export function resolveCongregationFilter(
  value: string | null | undefined
): { ok: true; congregationId?: string } | { ok: false; message: string } {
  if (value === undefined || value === null || value === '' || value === 'all') {
    return { ok: true };
  }

  if (value === 'sede') {
    return {
      ok: false,
      message:
        'O filtro "sede" não é mais suportado. Use o ID da congregação principal.',
    };
  }

  return { ok: true, congregationId: value };
}
