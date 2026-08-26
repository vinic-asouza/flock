import { AuditActor } from './auditActors';
import {
  breakdownKey,
  isCommerciallyActive,
} from '../utils/commerciallyActive';

export const OPS_LOG_CAP = 20;

export type OpsOverview = {
  total: number;
  commercially_active: number;
  commercially_inactive: number;
  by_plan_type: Record<string, number>;
  by_subscription_status: Record<string, number>;
};

export type OpsChurchListItem = {
  id: string;
  name: string;
  cnpj: string;
  plan_type: string | null;
  subscription_status: string | null;
  commercially_active: boolean;
  members_active_count: number;
  created_at: string;
};

export type OpsChurchUserCounts = {
  active: number;
  invited: number;
  disabled: number;
  total: number;
};

export type OpsSubscriptionEvent = {
  id: string;
  event_type: string;
  old_plan: string | null;
  new_plan: string | null;
  old_status: string | null;
  new_status: string | null;
  source: string;
  stripe_event_id: string | null;
  created_at: string;
};

export type OpsAuditLog = {
  id: string;
  created_at: string;
  entity: string;
  action: string;
  entity_id: string;
  actor: AuditActor;
};

export type OpsChurchDetail = {
  id: string;
  name: string;
  denomination: string;
  cnpj: string;
  address: string;
  city: string;
  state: string;
  created_at: string;
  email_church: string | null;
  phone_church: string | null;
  plan_type: string | null;
  subscription_status: string | null;
  commercially_active: boolean;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  subscription_updated_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  members_active_count: number;
  members_inactive_count: number;
  church_users: OpsChurchUserCounts;
  subscription_events: OpsSubscriptionEvent[];
  audit_logs: OpsAuditLog[];
};

export type ChurchOverviewRow = {
  plan_type: string | null;
  subscription_status: string | null;
};

export type ChurchListRow = {
  id: string;
  name: string;
  cnpj: string;
  plan_type: string | null;
  subscription_status: string | null;
  created_at: string;
};

export type ChurchDetailRow = {
  id: string;
  name: string;
  denomination: string;
  cnpj: string;
  address: string;
  city: string;
  state: string;
  created_at: string;
  email_church: string | null;
  phone_church: string | null;
  plan_type: string | null;
  subscription_status: string | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  subscription_updated_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

export type MemberCountRow = {
  church_id: string;
  active: boolean | null;
};

export type ChurchUserStatusRow = {
  status: string | null;
};

export type SubscriptionEventRow = {
  id: string;
  event_type: string;
  old_plan: string | null;
  new_plan: string | null;
  old_status: string | null;
  new_status: string | null;
  source: string;
  stripe_event_id: string | null;
  created_at: string;
  payload?: unknown;
};

export type AuditLogRow = {
  id: string;
  created_at: string;
  user_id: string;
  entity: string;
  action: string;
  entity_id: string;
  changes_before?: unknown;
  changes_after?: unknown;
  ip?: unknown;
  user_agent?: unknown;
};

export function aggregateOpsOverview(rows: ChurchOverviewRow[]): OpsOverview {
  const by_plan_type: Record<string, number> = {};
  const by_subscription_status: Record<string, number> = {};
  let commercially_active = 0;

  for (const row of rows) {
    const planKey = breakdownKey(row.plan_type);
    const statusKey = breakdownKey(row.subscription_status);
    by_plan_type[planKey] = (by_plan_type[planKey] ?? 0) + 1;
    by_subscription_status[statusKey] = (by_subscription_status[statusKey] ?? 0) + 1;
    if (isCommerciallyActive(row.subscription_status)) {
      commercially_active += 1;
    }
  }

  return {
    total: rows.length,
    commercially_active,
    commercially_inactive: rows.length - commercially_active,
    by_plan_type,
    by_subscription_status,
  };
}

export function countActiveMembersByChurch(
  rows: MemberCountRow[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.church_id || !row.active) {
      continue;
    }
    counts.set(row.church_id, (counts.get(row.church_id) ?? 0) + 1);
  }
  return counts;
}

export function countMembersByActive(rows: MemberCountRow[]): {
  active: number;
  inactive: number;
} {
  let active = 0;
  let inactive = 0;
  for (const row of rows) {
    if (row.active) {
      active += 1;
    } else {
      inactive += 1;
    }
  }
  return { active, inactive };
}

export function countChurchUsersByStatus(rows: ChurchUserStatusRow[]): OpsChurchUserCounts {
  const counts: OpsChurchUserCounts = {
    active: 0,
    invited: 0,
    disabled: 0,
    total: rows.length,
  };

  for (const row of rows) {
    if (row.status === 'active') {
      counts.active += 1;
    } else if (row.status === 'invited') {
      counts.invited += 1;
    } else if (row.status === 'disabled') {
      counts.disabled += 1;
    }
  }

  return counts;
}

export function toOpsChurchListItem(
  church: ChurchListRow,
  membersActiveCount: number
): OpsChurchListItem {
  return {
    id: church.id,
    name: church.name,
    cnpj: church.cnpj,
    plan_type: church.plan_type,
    subscription_status: church.subscription_status,
    commercially_active: isCommerciallyActive(church.subscription_status),
    members_active_count: membersActiveCount,
    created_at: church.created_at,
  };
}

export function toOpsSubscriptionEvent(row: SubscriptionEventRow): OpsSubscriptionEvent {
  return {
    id: row.id,
    event_type: row.event_type,
    old_plan: row.old_plan,
    new_plan: row.new_plan,
    old_status: row.old_status,
    new_status: row.new_status,
    source: row.source,
    stripe_event_id: row.stripe_event_id,
    created_at: row.created_at,
  };
}

export function toOpsAuditLog(row: AuditLogRow, actor: AuditActor): OpsAuditLog {
  return {
    id: row.id,
    created_at: row.created_at,
    entity: row.entity,
    action: row.action,
    entity_id: row.entity_id,
    actor,
  };
}

export function toOpsChurchDetail(input: {
  church: ChurchDetailRow;
  membersActive: number;
  membersInactive: number;
  churchUsers: OpsChurchUserCounts;
  subscriptionEvents: SubscriptionEventRow[];
  auditLogs: AuditLogRow[];
  actorsById: Record<string, AuditActor>;
}): OpsChurchDetail {
  const { church } = input;

  return {
    id: church.id,
    name: church.name,
    denomination: church.denomination,
    cnpj: church.cnpj,
    address: church.address,
    city: church.city,
    state: church.state,
    created_at: church.created_at,
    email_church: church.email_church,
    phone_church: church.phone_church,
    plan_type: church.plan_type,
    subscription_status: church.subscription_status,
    commercially_active: isCommerciallyActive(church.subscription_status),
    subscription_start_date: church.subscription_start_date,
    subscription_end_date: church.subscription_end_date,
    subscription_updated_at: church.subscription_updated_at,
    stripe_customer_id: church.stripe_customer_id,
    stripe_subscription_id: church.stripe_subscription_id,
    members_active_count: input.membersActive,
    members_inactive_count: input.membersInactive,
    church_users: input.churchUsers,
    subscription_events: input.subscriptionEvents.map(toOpsSubscriptionEvent),
    audit_logs: input.auditLogs.map((log) =>
      toOpsAuditLog(
        log,
        input.actorsById[log.user_id] ?? {
          id: log.user_id,
          email: null,
          displayName: 'Usuário indisponível',
        }
      )
    ),
  };
}

export function buildPagination(page: number, limit: number, total: number) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1 && totalPages > 0;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null,
  };
}
