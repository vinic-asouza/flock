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
  roles: Record<string, number>;
  congregations: Record<string, number>;
}

export interface Timeline {
  baptismsByYear: Record<string, number>;
  admissionsByYear: Record<string, number>;
  baptismsByMonth: Record<string, number>;
  admissionsByMonth: Record<string, number>;
  membersByYear?: Record<string, Member[]>;
  membersByMonth?: Record<string, Member[]>;
}

export interface Member {
  id: string;
  name: string;
  birth: string;
  active: boolean;
  role?: { 
    id: string;
    name: string; 
    description?: string;
  } | null;
  congregation?: { 
    id: string;
    name: string; 
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
  role_id?: string;
  occupation?: string;
  admission?: string;
  admission_date?: string;
  created_at: string;
  updated_at: string;
}

export interface TopOccupation {
  occupation: string;
  count: number;
}

export interface MemberReports {
  summary: MemberReportsSummary;
  demographics: Demographics;
  churchStructure: ChurchStructure;
  timeline: Timeline;
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
  role_id?: string;
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
  year: string;
  baptisms: number;
  admissions: number;
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
