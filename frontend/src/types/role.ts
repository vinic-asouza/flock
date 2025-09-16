export interface Role {
  id: string;
  church_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  activeMembersCount?: number;
}

export interface CreateRoleData {
  name: string;
  description?: string;
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
}
