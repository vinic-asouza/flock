import { supabaseAdmin } from './supabase';
import {
  OpsWaitlistListQuery,
  OpsWaitlistStatus,
} from '../validators/opsWaitlistValidator';
import { buildWaitlistSearchOrFilter } from '../utils/opsWaitlistSearch';
import { buildPagination } from './opsChurchMappers';
import {
  WAITLIST_LIST_COLUMNS,
  WaitlistListRow,
  toOpsWaitlistItem,
} from './opsWaitlistMappers';

export async function listOpsWaitlistData(query: OpsWaitlistListQuery) {
  const offset = (query.page - 1) * query.limit;

  let waitlistQuery = supabaseAdmin
    .from('waitlist')
    .select(WAITLIST_LIST_COLUMNS, { count: 'exact' });

  const searchOr = query.q ? buildWaitlistSearchOrFilter(query.q) : null;
  if (searchOr) {
    waitlistQuery = waitlistQuery.or(searchOr);
  }

  if (query.plan) {
    waitlistQuery = waitlistQuery.eq('plan', query.plan);
  }

  if (query.status !== 'all') {
    waitlistQuery = waitlistQuery.eq('status', query.status);
  }

  waitlistQuery = waitlistQuery
    .order(query.sort_by, { ascending: query.sort_order === 'asc' })
    .range(offset, offset + query.limit - 1);

  const { data, error, count } = await waitlistQuery;
  if (error) {
    throw error;
  }

  const rows = (data ?? []) as WaitlistListRow[];

  return {
    data: rows.map(toOpsWaitlistItem),
    pagination: buildPagination(query.page, query.limit, count ?? 0),
    filters: {
      q: query.q ?? null,
      plan: query.plan ?? null,
      status: query.status,
    },
    sorting: {
      sort_by: query.sort_by,
      sort_order: query.sort_order,
    },
  };
}

export type PatchWaitlistResult =
  | { kind: 'ok'; item: ReturnType<typeof toOpsWaitlistItem> }
  | { kind: 'not_found' }
  | { kind: 'conflict'; status: OpsWaitlistStatus };

export async function patchOpsWaitlistStatus(
  id: string,
  status: 'converted' | 'discarded',
  operatorId: string
): Promise<PatchWaitlistResult> {
  const { data: current, error: fetchError } = await supabaseAdmin
    .from('waitlist')
    .select('id, status')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }
  if (!current) {
    return { kind: 'not_found' };
  }
  if (current.status !== 'pending') {
    return { kind: 'conflict', status: current.status as OpsWaitlistStatus };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('waitlist')
    .update({
      status,
      status_updated_at: now,
      status_updated_by: operatorId,
      updated_at: now,
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select(WAITLIST_LIST_COLUMNS)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    return { kind: 'conflict', status: 'pending' };
  }

  return { kind: 'ok', item: toOpsWaitlistItem(data as WaitlistListRow) };
}
