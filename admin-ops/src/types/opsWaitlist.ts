export type OpsWaitlistStatus = "pending" | "converted" | "discarded";

export type OpsWaitlistListItem = {
  id: string;
  name: string;
  email: string;
  phone: string;
  church_name: string;
  city: string;
  state: string;
  plan: string;
  message: string | null;
  created_at: string;
  status: OpsWaitlistStatus;
  status_updated_at: string | null;
};

export type OpsWaitlistPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
};

export type OpsWaitlistListResponse = {
  data: OpsWaitlistListItem[];
  pagination: OpsWaitlistPagination;
  filters: {
    q: string | null;
    plan: string | null;
    status: string;
  };
  sorting: {
    sort_by: string;
    sort_order: string;
  };
};
