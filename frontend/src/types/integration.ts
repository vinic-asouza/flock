export type IntegrationStatus = 'em_progresso' | 'integrado' | 'descartado';

export type IntegrationGender = 'masculino' | 'feminino';

export type IntegrationMaritalStatus = 'solteiro' | 'casado' | 'divorciado' | 'viuvo' | 'outro';

export type IntegrationAdmissionType = 'batismo' | 'transferencia' | 'profissao de fe' | 'outro';

export type IntegrationBaptismType =
  | 'catolica'
  | 'adulto_nesta_igreja'
  | 'adulto_outra_igreja'
  | 'crianca_nesta_igreja'
  | 'crianca_outra_igreja'
  | 'novo_convertido'
  | 'sem_religiao';

export type IntegrationSundayAttendance =
  | 'todos_os_domingos'
  | 'regularmente'
  | 'as_vezes'
  | 'nao';

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
  years_evangelical?: string | null;
  evangelical_family?: boolean | null;
  is_baptized?: boolean | null;
  baptism_type?: IntegrationBaptismType | null;
  baptism_other_church_name?: string | null;
  previous_religion?: string | null;
  previous_church_active?: boolean | null;
  reason_joining?: string | null;
  time_attending?: string | null;
  sunday_attendance?: IntegrationSundayAttendance | null;
  weekly_activities?: boolean | null;
  weekly_activities_which?: string | null;
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
  years_evangelical?: string | null;
  evangelical_family?: boolean | null;
  is_baptized?: boolean | null;
  baptism_type?: IntegrationBaptismType | null;
  baptism_other_church_name?: string | null;
  previous_religion?: string | null;
  previous_church_active?: boolean | null;
  reason_joining?: string | null;
  time_attending?: string | null;
  sunday_attendance?: IntegrationSundayAttendance | null;
  weekly_activities?: boolean | null;
  weekly_activities_which?: string | null;
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

