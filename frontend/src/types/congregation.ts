export interface Congregation {
  id: string;
  church_id: string;
  name: string;
  abbreviation?: string | null;
  address: string;
  city: string;
  state: string;
  leader?: string;
  phone?: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  activeMembersCount?: number;
}

export interface CreateCongregationData {
  name: string;
  abbreviation?: string;
  address: string;
  city: string;
  state: string;
  leader?: string;
  phone?: string;
}

export interface UpdateCongregationData {
  name?: string;
  abbreviation?: string | null;
  address?: string;
  city?: string;
  state?: string;
  leader?: string;
  phone?: string;
}
