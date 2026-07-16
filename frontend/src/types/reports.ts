import { IntegrationStatus } from './integration';

// Tipos para relatórios e estatísticas de membros

export interface MemberReportsSummary {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  recentMembers: number;
  recentBaptisms: number;
  activePercentage: number;
}

export interface Demographics {
  gender: Record<string, number>;
  maritalStatus: Record<string, number>;
  ageRanges: {
    '0-12': number;
    '13-17': number;
    '18-25': number;
    '26-35': number;
    '36-50': number;
    '51-65': number;
    '65+': number;
  };
  cities: Record<string, number>;
  states: Record<string, number>;
}

export interface ChurchStructure {
  congregations: Record<string, { count: number; id: string | null }>;
}

export interface Timeline {
  baptismsByYear: Record<string, number>;
  admissionsByYear: Record<string, number>;
  baptismsByMonth: Record<string, number>;
  admissionsByMonth: Record<string, number>;
  membersByYear?: Record<string, Member[]>;
  membersByMonth?: Record<string, Member[]>;
}

export interface IntegrationStatusCounts {
  inProgress: number;
  integrated: number;
  discarded: number;
}

export interface IntegrationMemberSummary {
  id: string;
  name: string;
  status: IntegrationStatus;
  created_at: string;
  expected_congregation?: {
    id: string;
    name: string | null;
    abbreviation?: string | null;
  } | null;
  mentor?: {
    id: string;
    name: string | null;
  } | null;
}

export interface IntegrationTimeline {
  totalsByYear: Record<string, IntegrationStatusCounts>;
  totalsByMonth: Record<string, IntegrationStatusCounts>;
  membersByYear: Record<string, IntegrationMemberSummary[]>;
  membersByMonth: Record<string, IntegrationMemberSummary[]>;
}

export interface IntegrationReports {
  totals: IntegrationStatusCounts & { total: number };
  timeline: IntegrationTimeline;
}

export interface Member {
  id: string;
  name: string;
  birth: string;
  active: boolean;
  congregation?: { 
    id: string;
    name: string;
    abbreviation?: string | null;
    address: string;
    city: string;
    state: string;
    leader?: string;
    phone?: string;
  } | null;
  congregation_id?: string | null;
  gender: string;
  marital_status: string;
  nationality?: string;
  document?: string;
  spouse?: string;
  address?: string;
  complement?: string;
  cep?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  baptism_date?: string;
  occupation?: string;
  admission?: string;
  admission_date?: string;
  father_name?: string;
  mother_name?: string;
  children?: Array<{
    id?: string;
    name: string;
    birth?: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface TopOccupation {
  occupation: string;
  count: number;
}

export interface IntegrationMeta {
  available: boolean;
  error?: string;
}

export interface MemberReports {
  summary: MemberReportsSummary;
  demographics: Demographics;
  churchStructure: ChurchStructure;
  timeline: Timeline;
  integration: IntegrationReports | null;
  integrationMeta?: IntegrationMeta;
  topOccupations: TopOccupation[];
  filters: {
    congregation_id: string | null;
  };
  generatedAt: string;
}

// Tipos para filtros de relatórios
export interface ReportFilters {
  // Filtros básicos
  active?: boolean;
  congregation_id?: string;
  
  // Filtros demográficos
  gender?: string;
  marital_status?: string;
  nationality?: string;
  occupation?: string;
  city?: string;
  state?: string;
  
  // Filtros temporais
  birth_date_from?: string;
  birth_date_to?: string;
  baptism_date_from?: string;
  baptism_date_to?: string;
  admission_date_from?: string;
  admission_date_to?: string;
  age_from?: number;
  age_to?: number;
  
  // Busca geral
  search?: string;
}

// Tipos para componentes de gráficos
export interface ChartData {
  label: string;
  value: number;
  color?: string;
}

export interface PieChartData extends ChartData {
  percentage?: number;
}

export interface BarChartData extends ChartData {
  category?: string;
}

export interface LineChartData {
  label: string;
  total: number;
}

// Tipos para exportação
export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  includeCharts: boolean;
  dateRange?: {
    from: string;
    to: string;
  };
}

// Tipos para estado do dashboard
export interface ReportsState {
  data: MemberReports | null;
  loading: boolean;
  error: string | null;
  filters: ReportFilters;
  lastUpdated: string | null;
}
