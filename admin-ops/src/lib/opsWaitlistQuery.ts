export const OPS_WAITLIST_PLANS = [
  "200",
  "500",
  "800",
  "personalizado",
] as const;

export const OPS_WAITLIST_SORT_FIELDS = ["created_at"] as const;

export type OpsWaitlistPlan = (typeof OPS_WAITLIST_PLANS)[number];
export type OpsWaitlistSortField = (typeof OPS_WAITLIST_SORT_FIELDS)[number];

export type OpsWaitlistListQuery = {
  page: number;
  limit: number;
  q?: string;
  plan?: OpsWaitlistPlan;
  sort_by: OpsWaitlistSortField;
  sort_order: "asc" | "desc";
};

export const DEFAULT_WAITLIST_LIST_QUERY: OpsWaitlistListQuery = {
  page: 1,
  limit: 20,
  sort_by: "created_at",
  sort_order: "desc",
};

function isPlan(value: string): value is OpsWaitlistPlan {
  return (OPS_WAITLIST_PLANS as readonly string[]).includes(value);
}

function isSortField(value: string): value is OpsWaitlistSortField {
  return (OPS_WAITLIST_SORT_FIELDS as readonly string[]).includes(value);
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

export function hasActiveWaitlistFilters(query: OpsWaitlistListQuery): boolean {
  return Boolean(query.q || query.plan);
}

export function parseWaitlistListSearchParams(
  params: URLSearchParams
): OpsWaitlistListQuery {
  const page = parsePositiveInt(
    params.get("page"),
    DEFAULT_WAITLIST_LIST_QUERY.page
  );
  const limit = Math.min(
    100,
    parsePositiveInt(params.get("limit"), DEFAULT_WAITLIST_LIST_QUERY.limit)
  );
  const q = (params.get("q") ?? "").trim().slice(0, 80);
  const plan = params.get("plan") ?? "";
  const sortBy = params.get("sort_by") ?? DEFAULT_WAITLIST_LIST_QUERY.sort_by;
  const sortOrder =
    params.get("sort_order") ?? DEFAULT_WAITLIST_LIST_QUERY.sort_order;

  const query: OpsWaitlistListQuery = {
    page,
    limit,
    sort_by: isSortField(sortBy) ? sortBy : DEFAULT_WAITLIST_LIST_QUERY.sort_by,
    sort_order: sortOrder === "asc" ? "asc" : "desc",
  };

  if (q) {
    query.q = q;
  }
  if (isPlan(plan)) {
    query.plan = plan;
  }

  return query;
}

export function serializeWaitlistListQuery(
  query: OpsWaitlistListQuery
): URLSearchParams {
  const params = new URLSearchParams();

  if (query.page !== DEFAULT_WAITLIST_LIST_QUERY.page) {
    params.set("page", String(query.page));
  }
  if (query.limit !== DEFAULT_WAITLIST_LIST_QUERY.limit) {
    params.set("limit", String(query.limit));
  }
  if (query.q) {
    params.set("q", query.q);
  }
  if (query.plan) {
    params.set("plan", query.plan);
  }
  if (query.sort_by !== DEFAULT_WAITLIST_LIST_QUERY.sort_by) {
    params.set("sort_by", query.sort_by);
  }
  if (query.sort_order !== DEFAULT_WAITLIST_LIST_QUERY.sort_order) {
    params.set("sort_order", query.sort_order);
  }

  return params;
}

export function waitlistListHref(
  patch: Partial<OpsWaitlistListQuery> = {}
): string {
  const query: OpsWaitlistListQuery = {
    ...DEFAULT_WAITLIST_LIST_QUERY,
    ...patch,
  };
  const params = serializeWaitlistListQuery(query);
  const qs = params.toString();
  return qs ? `/waitlist?${qs}` : "/waitlist";
}

export function toWaitlistListApiParams(
  query: OpsWaitlistListQuery
): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: query.page,
    limit: query.limit,
    sort_by: query.sort_by,
    sort_order: query.sort_order,
  };

  if (query.q) {
    params.q = query.q;
  }
  if (query.plan) {
    params.plan = query.plan;
  }

  return params;
}
