// Tipos para o módulo de Calendário

export type CalendarItemType = 'Programação' | 'Evento' | 'Encontro' | 'Reunião';
export type CalendarStatus = 'active' | 'cancelled' | 'postponed';
export type RecurrencePattern = 'weekly' | 'monthly';
export type CalendarViewMode = 'month' | 'week' | 'list';

export interface CalendarItem {
  id: string;
  church_id: string;
  title: string;
  type: CalendarItemType;
  description?: string | null;
  start_date: string; // ISO string (para não recorrentes: data/hora completa, para recorrentes: apenas data de início da recorrência)
  end_date?: string | null;
  is_recurring: boolean;
  recurrence_pattern?: RecurrencePattern | null;
  recurrence_end_date?: string | null;
  recurrence_time?: string | null; // Formato HH:mm
  recurrence_duration_minutes?: number | null;
  recurrence_day_of_week?: number | null; // 0 = Domingo, 6 = Sábado
  recurrence_day_of_month?: number | null; // 1-31
  recurrence_week_of_month?: number | null; // -1 = último, 1-4 = primeira a quarta semana
  location?: string | null;
  congregation_id?: string | null;
  status: CalendarStatus;
  group_id?: string | null;
  responsible_member_id?: string | null;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  congregation?: {
    id: string;
    name: string;
  } | null;
  group?: {
    id: string;
    name: string;
    type: string;
  } | null;
  responsible_member?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateCalendarItemData {
  title: string;
  type: CalendarItemType;
  description?: string;
  start_date: string; // Para não recorrentes: datetime completo, para recorrentes: apenas data (YYYY-MM-DD)
  end_date?: string; // Apenas para não recorrentes
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern;
  recurrence_end_date?: string; // Data de término da recorrência (opcional)
  recurrence_time?: string; // Horário no formato HH:mm (obrigatório se recorrente)
  recurrence_duration_minutes?: number; // Duração em minutos (opcional)
  recurrence_day_of_week?: number; // 0-6 (obrigatório se weekly)
  recurrence_day_of_month?: number; // 1-31 (obrigatório se monthly com dia fixo)
  recurrence_week_of_month?: number; // -1, 1-4 (obrigatório se monthly com semana)
  location?: string;
  congregation_id?: string | null;
  status?: CalendarStatus;
  group_id?: string | null;
  responsible_member_id?: string | null;
}

export interface UpdateCalendarItemData extends Partial<CreateCalendarItemData> {}

export interface CalendarFilters {
  type?: CalendarItemType[];
  congregation_id?: string;
  group_id?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}

export interface CalendarListResponse {
  data: CalendarItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Cores por tipo de item
export const typeColors = {
  'Programação': 'bg-blue-100 text-blue-800 border-blue-300',
  'Evento': 'bg-green-100 text-green-800 border-green-300',
  'Encontro': 'bg-orange-100 text-orange-800 border-orange-300',
  'Reunião': 'bg-gray-100 text-gray-800 border-gray-300'
};

// Ícones por tipo (usando lucide-react)
export const typeIcons = {
  'Programação': 'Calendar',
  'Evento': 'PartyPopper',
  'Encontro': 'Users',
  'Reunião': 'Briefcase'
};
