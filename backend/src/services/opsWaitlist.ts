import { supabaseAdmin } from './supabase';
import { OpsWaitlistListQuery } from '../validators/opsWaitlistValidator';
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
    },
    sorting: {
      sort_by: query.sort_by,
      sort_order: query.sort_order,
    },
  };
}
