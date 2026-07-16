export type IntegrationStatus = 'em_progresso' | 'integrado' | 'descartado';

export type IntegrationGender = 'masculino' | 'feminino';

export type IntegrationMaritalStatus = 'solteiro' | 'casado' | 'divorciado' | 'viuvo' | 'outro';

export type IntegrationAdmissionType = 'batismo' | 'transferencia' | 'profissao de fe' | 'outro';

export interface IntegrationMember {
  id: string;
  church_id: string;
  name: string;
  birth?: string | null;
  gender?: IntegrationGender | null;
  marital_status?: IntegrationMaritalStatus | null;
  phone?: string | null;
  whatsapp?: string | null;
  expected_admission_type?: IntegrationAdmissionType | null;
  expected_congregation_id?: string | null;
  mentor_id?: string | null;
  notes?: string | null;
  status: IntegrationStatus;
  created_at: string;
  updated_at: string;
  expected_congregation?: {
    id: string;
    name: string;
    abbreviation?: string | null;
    city: string;
    state: string;
  } | null;
  mentor?: {
    id: string;
    name: string;
    phone?: string | null;
    whatsapp?: string | null;
  } | null;
}

export interface IntegrationMemberPayload {
  name: string;
  birth?: string | null;
  gender?: IntegrationGender | null;
  marital_status?: IntegrationMaritalStatus | null;
  phone?: string | null;
  whatsapp?: string | null;
  expected_admission_type?: IntegrationAdmissionType | null;
  expected_congregation_id?: string | null;
  mentor_id?: string | null;
  notes?: string | null;
  status?: IntegrationStatus;
}

export interface IntegrationMemberListResponse {
  data: IntegrationMember[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    nextPage: number | null;
    prevPage: number | null;
  };
  filters?: Record<string, unknown>;
  sorting?: {
    sort_by: string;
    sort_order: 'asc' | 'desc';
  };
}

export interface IntegrationFilters {
  search: string;
  status: 'todos' | IntegrationStatus;
  expectedCongregationId: string;
  mentorId: string;
  sort_by: string;
  sort_order: 'asc' | 'desc';
}

