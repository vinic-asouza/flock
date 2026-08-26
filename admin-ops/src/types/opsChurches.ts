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

export type OpsPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
};

export type OpsChurchListResponse = {
  data: OpsChurchListItem[];
  pagination: OpsPagination;
  filters: {
    q: string | null;
    plan_type: string | null;
    subscription_status: string | null;
    commercially_active: boolean | null;
  };
  sorting: {
    sort_by: string;
    sort_order: string;
  };
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

export type OpsAuditActor = {
  id: string;
  email: string | null;
  displayName: string;
};

export type OpsAuditLog = {
  id: string;
  created_at: string;
  entity: string;
  action: string;
  entity_id: string;
  actor: OpsAuditActor;
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
