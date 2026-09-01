import { supabaseAdmin } from './supabase';
import { COMMERCIALLY_ACTIVE_STATUSES } from '../utils/commerciallyActive';
import { buildChurchSearchOrFilter } from '../utils/opsChurchSearch';
import { OpsChurchListQuery } from '../validators/opsChurchesValidator';
import { resolveAuditActors } from './auditActors';
import {
  aggregateOpsOverview,
  buildPagination,
  ChurchDetailRow,
  ChurchListRow,
  ChurchOverviewRow,
  ChurchUserStatusRow,
  countChurchUsersByStatus,
  countMembersByActive,
  countMembersByChurch,
  MemberCountRow,
  OPS_LOG_CAP,
  AuditLogRow,
  SubscriptionEventRow,
  toOpsChurchDetail,
  toOpsChurchListItem,
} from './opsChurchMappers';

const CHURCH_LIST_COLUMNS =
  'id, name, cnpj, denomination, city, state, address, email_church, phone_church, plan_type, subscription_status, subscription_start_date, subscription_end_date, created_at';

const CHURCH_DETAIL_COLUMNS =
  'id, name, denomination, cnpj, address, city, state, created_at, email_church, phone_church, plan_type, subscription_status, subscription_start_date, subscription_end_date, subscription_updated_at, stripe_customer_id, stripe_subscription_id';

const SUBSCRIPTION_EVENT_COLUMNS =
  'id, event_type, old_plan, new_plan, old_status, new_status, source, stripe_event_id, created_at';

const AUDIT_LOG_COLUMNS = 'id, created_at, user_id, entity, action, entity_id';

export async function getOpsOverviewData() {
  const { data, error } = await supabaseAdmin
    .from('churches')
    .select('plan_type, subscription_status');

  if (error) {
    throw error;
  }

  return aggregateOpsOverview((data ?? []) as ChurchOverviewRow[]);
}

export async function listOpsChurchesData(query: OpsChurchListQuery) {
  const offset = (query.page - 1) * query.limit;

  let churchesQuery = supabaseAdmin
    .from('churches')
    .select(CHURCH_LIST_COLUMNS, { count: 'exact' });

  const searchOr = query.q ? buildChurchSearchOrFilter(query.q) : null;
  if (searchOr) {
    churchesQuery = churchesQuery.or(searchOr);
  }

  if (query.plan_type) {
    churchesQuery = churchesQuery.eq('plan_type', query.plan_type);
  }

  if (query.subscription_status) {
    churchesQuery = churchesQuery.eq('subscription_status', query.subscription_status);
  }

  if (query.commercially_active === true) {
    churchesQuery = churchesQuery.in('subscription_status', [...COMMERCIALLY_ACTIVE_STATUSES]);
  } else if (query.commercially_active === false) {
    churchesQuery = churchesQuery.or(
      'subscription_status.is.null,subscription_status.not.in.(active,trialing)'
    );
  }

  churchesQuery = churchesQuery
    .order(query.sort_by, { ascending: query.sort_order === 'asc' })
    .range(offset, offset + query.limit - 1);

  const { data, error, count } = await churchesQuery;
  if (error) {
    throw error;
  }

  const rows = (data ?? []) as ChurchListRow[];
  const ids = rows.map((row) => row.id);
  const memberCounts = await fetchMemberCounts(ids);

  return {
    data: rows.map((row) => {
      const counts = memberCounts.get(row.id) ?? { active: 0, inactive: 0 };
      return toOpsChurchListItem(row, counts.active, counts.inactive);
    }),
    pagination: buildPagination(query.page, query.limit, count ?? 0),
    filters: {
      q: query.q ?? null,
      plan_type: query.plan_type ?? null,
      subscription_status: query.subscription_status ?? null,
      commercially_active:
        typeof query.commercially_active === 'boolean' ? query.commercially_active : null,
    },
    sorting: {
      sort_by: query.sort_by,
      sort_order: query.sort_order,
    },
  };
}

export async function getOpsChurchDetailData(id: string) {
  const { data: church, error: churchError } = await supabaseAdmin
    .from('churches')
    .select(CHURCH_DETAIL_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (churchError) {
    throw churchError;
  }
  if (!church) {
    return null;
  }

  const [memberRows, userRows, subscriptionEvents, auditLogs] = await Promise.all([
    supabaseAdmin.from('members').select('church_id, active').eq('church_id', id),
    supabaseAdmin.from('church_users').select('status').eq('church_id', id),
    supabaseAdmin
      .from('church_subscription_events')
      .select(SUBSCRIPTION_EVENT_COLUMNS)
      .eq('church_id', id)
      .order('created_at', { ascending: false })
      .limit(OPS_LOG_CAP),
    supabaseAdmin
      .from('audit_logs')
      .select(AUDIT_LOG_COLUMNS)
      .eq('church_id', id)
      .order('created_at', { ascending: false })
      .limit(OPS_LOG_CAP),
  ]);

  if (memberRows.error) throw memberRows.error;
  if (userRows.error) throw userRows.error;
  if (subscriptionEvents.error) throw subscriptionEvents.error;
  if (auditLogs.error) throw auditLogs.error;

  const memberCounts = countMembersByActive((memberRows.data ?? []) as MemberCountRow[]);
  const churchUsers = countChurchUsersByStatus((userRows.data ?? []) as ChurchUserStatusRow[]);
  const logs = (auditLogs.data ?? []) as AuditLogRow[];
  const actorsById = await resolveAuditActors(logs.map((log) => log.user_id));

  return toOpsChurchDetail({
    church: church as ChurchDetailRow,
    membersActive: memberCounts.active,
    membersInactive: memberCounts.inactive,
    churchUsers,
    subscriptionEvents: (subscriptionEvents.data ?? []) as SubscriptionEventRow[],
    auditLogs: logs,
    actorsById,
  });
}

async function fetchMemberCounts(
  churchIds: string[]
): Promise<Map<string, { active: number; inactive: number }>> {
  if (churchIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabaseAdmin
    .from('members')
    .select('church_id, active')
    .in('church_id', churchIds);

  if (error) {
    throw error;
  }

  return countMembersByChurch((data ?? []) as MemberCountRow[]);
}
