import { supabaseAdmin as supabase } from './supabase';

export const EVENT_FULL_MESSAGE = 'Não há vagas disponíveis.';

export function computeSpotsRemaining(
  capacity: number | null | undefined,
  registrationCount: number
): number | null {
  if (capacity == null) return null;
  return Math.max(capacity - Math.max(registrationCount, 0), 0);
}

export function isEventFull(
  capacity: number | null | undefined,
  registrationCount: number
): boolean {
  if (capacity == null) return false;
  return registrationCount >= capacity;
}

export async function countEventRegistrations(
  eventId: string,
  churchId: string
): Promise<{ count: number; error: { message: string } | null }> {
  const { count, error } = await supabase
    .from('event_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('church_id', churchId);

  return { count: count ?? 0, error: error ? { message: error.message } : null };
}

export type InsertWithCapacityResult =
  | { ok: true; registration: any }
  | { ok: false; reason: 'full' }
  | { ok: false; reason: 'error'; message: string; code?: string };

/**
 * Insere inscrição respeitando a capacidade. Checagem antes do insert e
 * verificação depois (rollback) para reduzir overbooking em concorrência.
 */
export async function insertEventRegistrationWithCapacity(
  event: { id: string; church_id: string; capacity: number | null },
  payload: Record<string, unknown>
): Promise<InsertWithCapacityResult> {
  if (event.capacity != null) {
    const { count, error } = await countEventRegistrations(event.id, event.church_id);
    if (error) return { ok: false, reason: 'error', message: error.message };
    if (isEventFull(event.capacity, count)) return { ok: false, reason: 'full' };
  }

  const { data: registration, error: insertError } = await supabase
    .from('event_registrations')
    .insert([payload])
    .select()
    .single();

  if (insertError || !registration) {
    return {
      ok: false,
      reason: 'error',
      message: insertError?.message || 'Não foi possível criar a inscrição',
      code: insertError?.code,
    };
  }

  if (event.capacity != null) {
    const { count } = await countEventRegistrations(event.id, event.church_id);
    if (count > event.capacity) {
      await supabase.from('event_registrations').delete().eq('id', registration.id);
      return { ok: false, reason: 'full' };
    }
  }

  return { ok: true, registration };
}
