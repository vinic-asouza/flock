import { supabaseAdmin } from '../services/supabase';
import { logError } from './logger';

export interface RegistrationAuditInput {
  churchId: string;
  churchName: string;
  userId: string;
  /** Plano pago já vinculado no register. Sem isso, o cadastro nasce no grátis. */
  paidPlanLinked: boolean;
  ip?: string | null;
  userAgent?: string | null;
}

interface AuditRow {
  user_id: string;
  church_id: string;
  entity: 'church';
  entity_id: string;
  action: 'create' | 'update';
  changes_before: { name: string } | null;
  changes_after: {
    name: string;
    event: 'church_registered' | 'free_plan_activated';
    dedupe_key: string;
    new_plan?: '100';
  };
  ip: string | null;
  user_agent: string | null;
}

export function buildRegistrationAuditRows(input: RegistrationAuditInput): AuditRow[] {
  const name = input.churchName.trim() || 'Igreja';
  const rows: AuditRow[] = [
    {
      user_id: input.userId,
      church_id: input.churchId,
      entity: 'church',
      entity_id: input.churchId,
      action: 'create',
      changes_before: null,
      changes_after: {
        name,
        event: 'church_registered',
        dedupe_key: `church_registered:${input.churchId}`,
      },
      ip: input.ip ?? null,
      user_agent: input.userAgent ?? null,
    },
  ];

  if (!input.paidPlanLinked) {
    rows.push({
      user_id: input.userId,
      church_id: input.churchId,
      entity: 'church',
      entity_id: input.churchId,
      action: 'update',
      changes_before: { name },
      changes_after: {
        name,
        event: 'free_plan_activated',
        new_plan: '100',
        dedupe_key: `free_plan_activated:${input.churchId}`,
      },
      ip: input.ip ?? null,
      user_agent: input.userAgent ?? null,
    });
  }

  return rows;
}

/**
 * Grava o cadastro e, no plano grátis, a ativação. Falha de audit não desfaz o 201.
 * A chave por igreja impede segunda linha se o insert for repetido.
 */
export async function recordRegistrationAudits(input: RegistrationAuditInput): Promise<void> {
  const rows = buildRegistrationAuditRows(input);

  for (const row of rows) {
    const dedupeKey = row.changes_after.dedupe_key;
    try {
      const { data: existing, error: lookupError } = await supabaseAdmin
        .from('audit_logs')
        .select('id')
        .eq('church_id', input.churchId)
        .filter('changes_after->>dedupe_key', 'eq', dedupeKey)
        .limit(1)
        .maybeSingle();

      if (lookupError) {
        logError('Falha ao consultar audit de cadastro', lookupError);
        continue;
      }
      if (existing) continue;

      const { error } = await supabaseAdmin.from('audit_logs').insert(row);
      if (error) {
        logError('Falha ao registrar audit de cadastro', error);
      }
    } catch (error) {
      logError('Falha ao registrar audit de cadastro', error);
    }
  }
}
