export type OpsWaitlistStatus = 'pending' | 'converted' | 'discarded';

export type WaitlistListRow = {
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

export const WAITLIST_LIST_COLUMNS =
  'id, name, email, phone, church_name, city, state, plan, message, created_at, status, status_updated_at';

export function toOpsWaitlistItem(row: WaitlistListRow): OpsWaitlistListItem {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    church_name: row.church_name,
    city: row.city,
    state: row.state,
    plan: row.plan,
    message: row.message ?? null,
    created_at: row.created_at,
    status: row.status,
    status_updated_at: row.status_updated_at ?? null,
  };
}
