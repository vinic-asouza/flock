export const OPS_CHURCH_PLAN_TYPES = [
  "100",
  "200",
  "500",
  "800",
  "custom",
] as const;

export const OPS_CHURCH_SUBSCRIPTION_STATUSES = [
  "active",
  "canceled",
  "past_due",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "trialing",
  "paused",
] as const;

export const OPS_CHURCH_SORT_FIELDS = ["created_at", "name", "cnpj"] as const;

export const NONE_BREAKDOWN_KEY = "none";

export type OpsChurchPlanType = (typeof OPS_CHURCH_PLAN_TYPES)[number];
export type OpsChurchSubscriptionStatus =
  (typeof OPS_CHURCH_SUBSCRIPTION_STATUSES)[number];
export type OpsChurchSortField = (typeof OPS_CHURCH_SORT_FIELDS)[number];

export type OpsChurchListQuery = {
  page: number;
  limit: number;
  q?: string;
  plan_type?: OpsChurchPlanType;
  subscription_status?: OpsChurchSubscriptionStatus;
  commercially_active?: boolean;
  sort_by: OpsChurchSortField;
  sort_order: "asc" | "desc";
};

export const DEFAULT_CHURCH_LIST_QUERY: OpsChurchListQuery = {
  page: 1,
  limit: 20,
  sort_by: "created_at",
  sort_order: "desc",
};

function isPlanType(value: string): value is OpsChurchPlanType {
  return (OPS_CHURCH_PLAN_TYPES as readonly string[]).includes(value);
}

function isSubscriptionStatus(
  value: string
): value is OpsChurchSubscriptionStatus {
  return (OPS_CHURCH_SUBSCRIPTION_STATUSES as readonly string[]).includes(
    value
  );
}

function isSortField(value: string): value is OpsChurchSortField {
  return (OPS_CHURCH_SORT_FIELDS as readonly string[]).includes(value);
}

function parsePositiveInt(raw: string | null, fallback: number): number {
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

export function isFilterableBreakdownKey(
  key: string,
  kind: "plan" | "status"
): boolean {
  if (!key || key === NONE_BREAKDOWN_KEY) {
    return false;
  }
  return kind === "plan" ? isPlanType(key) : isSubscriptionStatus(key);
}

export function hasActiveChurchFilters(query: OpsChurchListQuery): boolean {
  return Boolean(
    query.q ||
      query.plan_type ||
      query.subscription_status ||
      typeof query.commercially_active === "boolean"
  );
}

export function parseChurchListSearchParams(
  params: URLSearchParams
): OpsChurchListQuery {
  const page = parsePositiveInt(
    params.get("page"),
    DEFAULT_CHURCH_LIST_QUERY.page
  );
  const limit = Math.min(
    100,
    parsePositiveInt(params.get("limit"), DEFAULT_CHURCH_LIST_QUERY.limit)
  );
  const q = (params.get("q") ?? "").trim().slice(0, 80);
  const planType = params.get("plan_type") ?? "";
  const status = params.get("subscription_status") ?? "";
  const commerciallyActive = params.get("commercially_active");
  const sortBy = params.get("sort_by") ?? DEFAULT_CHURCH_LIST_QUERY.sort_by;
  const sortOrder =
    params.get("sort_order") ?? DEFAULT_CHURCH_LIST_QUERY.sort_order;

  const query: OpsChurchListQuery = {
    page,
    limit,
    sort_by: isSortField(sortBy) ? sortBy : DEFAULT_CHURCH_LIST_QUERY.sort_by,
    sort_order: sortOrder === "asc" ? "asc" : "desc",
  };

  if (q) {
    query.q = q;
  }
  if (isPlanType(planType)) {
    query.plan_type = planType;
  }
  if (isSubscriptionStatus(status)) {
    query.subscription_status = status;
  }
  if (commerciallyActive === "true") {
    query.commercially_active = true;
  } else if (commerciallyActive === "false") {
    query.commercially_active = false;
  }

  return query;
}

export function serializeChurchListQuery(
  query: OpsChurchListQuery
): URLSearchParams {
  const params = new URLSearchParams();

  if (query.page !== DEFAULT_CHURCH_LIST_QUERY.page) {
    params.set("page", String(query.page));
  }
  if (query.limit !== DEFAULT_CHURCH_LIST_QUERY.limit) {
    params.set("limit", String(query.limit));
  }
  if (query.q) {
    params.set("q", query.q);
  }
  if (query.plan_type) {
    params.set("plan_type", query.plan_type);
  }
  if (query.subscription_status) {
    params.set("subscription_status", query.subscription_status);
  }
  if (typeof query.commercially_active === "boolean") {
    params.set("commercially_active", String(query.commercially_active));
  }
  if (query.sort_by !== DEFAULT_CHURCH_LIST_QUERY.sort_by) {
    params.set("sort_by", query.sort_by);
  }
  if (query.sort_order !== DEFAULT_CHURCH_LIST_QUERY.sort_order) {
    params.set("sort_order", query.sort_order);
  }

  return params;
}

export function churchesListHref(
  patch: Partial<OpsChurchListQuery> = {}
): string {
  const query: OpsChurchListQuery = {
    ...DEFAULT_CHURCH_LIST_QUERY,
    ...patch,
  };
  const params = serializeChurchListQuery(query);
  const qs = params.toString();
  return qs ? `/churches?${qs}` : "/churches";
}

export function churchDetailHref(
  churchId: string,
  listQuery: Partial<OpsChurchListQuery> = {}
): string {
  const params = serializeChurchListQuery({
    ...DEFAULT_CHURCH_LIST_QUERY,
    ...listQuery,
  });
  const qs = params.toString();
  return qs ? `/churches/${churchId}?${qs}` : `/churches/${churchId}`;
}

export function toChurchListApiParams(
  query: OpsChurchListQuery
): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {
    page: query.page,
    limit: query.limit,
    sort_by: query.sort_by,
    sort_order: query.sort_order,
  };

  if (query.q) {
    params.q = query.q;
  }
  if (query.plan_type) {
    params.plan_type = query.plan_type;
  }
  if (query.subscription_status) {
    params.subscription_status = query.subscription_status;
  }
  if (typeof query.commercially_active === "boolean") {
    params.commercially_active = query.commercially_active;
  }

  return params;
}
