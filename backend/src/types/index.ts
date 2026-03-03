import { Request } from 'express';
import { User } from '@supabase/supabase-js';

export interface Church {
  id: string;
  user_id: string;
  name: string;
  denomination: string;
  address: string;
  city: string;
  state: string;
  cnpj: string;
  email_church?: string;
  phone_church?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status?: string;
  plan_type?: '100' | '200' | '500' | '800';
  subscription_start_date?: Date;
  subscription_end_date?: Date;
  subscription_updated_at?: Date;
  created_at: Date;
}

export interface Congregation {
  id: string;
  church_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  leader?: string;
  phone?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Child {
  name: string;
  birth?: string;
  dependent?: boolean;
}

export interface Member {
  id: string;
  church_id: string;
  name: string;
  birth: Date;
  gender: 'Masculino' | 'Feminino';
  marital_status: 'Solteiro' | 'Casado' | 'Divorciado' | 'Viúvo' | 'Outro';
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
  baptism_date?: Date;
  occupation?: string;
  admission?: string;
  admission_date?: Date;
  congregation_id?: string;
  father_name?: string;
  mother_name?: string;
  children?: Child[];
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface IntegrationMember {
  id: string;
  church_id: string;
  name: string;
  birth?: Date;
  gender?: 'masculino' | 'feminino';
  marital_status?: 'solteiro' | 'casado' | 'divorciado' | 'viuvo' | 'outro';
  phone?: string;
  whatsapp?: string;
  expected_admission_type?: 'batismo' | 'transferencia' | 'profissao de fe' | 'outro';
  expected_congregation_id?: string | null;
  mentor_id?: string | null;
  notes?: string | null;
  status: 'em_progresso' | 'integrado' | 'descartado';
  created_at: Date;
  updated_at: Date;
}

/** Papel do usuário na igreja (church_users.role) */
export type ChurchUserRole = 'owner' | 'admin' | 'editor' | 'reader';

/** Status do vínculo na igreja */
export type ChurchUserStatus = 'active' | 'invited' | 'disabled';

/** Contexto de igreja + papel para o usuário autenticado */
export interface ChurchContext {
  churchId: string;
  role: ChurchUserRole;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
  /** Preenchido pelo auth middleware quando o usuário pertence a uma igreja */
  church?: ChurchContext;
}

export interface ChurchRegistrationData {
  email: string;
  password: string;
  phone?: string;
  name: string;
  denomination: string;
  address: string;
  city: string;
  state: string;
  cnpj: string;
  email_church?: string;
  phone_church?: string;
}

export interface PublicRegistrationLink {
  id: string;
  church_id: string;
  token: string;
  expires_at: Date;
  max_uses?: number | null;
  current_uses: number;
  is_active: boolean;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
  default_congregation_id?: string | null;
  notes?: string | null;
}

export interface CreateRegistrationLinkData {
  expires_at: string; // ISO date string
  max_uses?: number | null;
  default_congregation_id?: string | null;
  notes?: string | null;
}

export interface PublicRegistrationRequest extends Request {
  registrationLink?: PublicRegistrationLink;
  churchId?: string;
}

export interface PublicIntegrationLink {
  id: string;
  church_id: string;
  token: string;
  expires_at: Date;
  max_uses?: number | null;
  current_uses: number;
  is_active: boolean;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
  notes?: string | null;
}

export interface CreateIntegrationLinkData {
  expires_at: string; // ISO date string
  max_uses?: number | null;
  notes?: string | null;
}

export interface PublicIntegrationRequest extends Request {
  integrationLink?: PublicIntegrationLink;
  churchId?: string;
}

export type GroupType = 
  | 'Ministério' 
  | 'Departamento' 
  | 'Grupo' 
  | 'Equipe' 
  | 'Time' 
  | 'Comissão' 
  | 'Célula' 
  | 'Grupo de Crescimento' 
  | 'Pequeno Grupo' 
  | 'Discipulado' 
  | 'Classe' 
  | 'Núcleo' 
  | 'Região';

export interface Group {
  id: string;
  church_id: string;
  congregation_id?: string | null;
  type: GroupType;
  name: string;
  description?: string | null;
  responsible_id?: string | null;
  status: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface MemberGroup {
  id: string;
  member_id: string;
  group_id: string;
  created_at: Date;
}

// Tipos para Calendário
export type CalendarItemType = 'Programação' | 'Evento' | 'Encontro' | 'Reunião';
export type CalendarStatus = 'active' | 'cancelled' | 'postponed';
export type RecurrencePattern = 'weekly' | 'monthly';

export interface CalendarItem {
  id: string;
  church_id: string;
  title: string;
  type: CalendarItemType;
  description?: string | null;
  start_date: Date;
  end_date?: Date | null;
  is_recurring: boolean;
  recurrence_pattern?: RecurrencePattern | null;
  recurrence_end_date?: Date | null;
  recurrence_time?: string | null; // Formato TIME (HH:mm:ss)
  recurrence_duration_minutes?: number | null;
  recurrence_day_of_week?: number | null; // 0 = Domingo, 6 = Sábado
  recurrence_day_of_month?: number | null; // 1-31
  recurrence_week_of_month?: number | null; // -1 = último, 1-4 = primeira a quarta semana
  location?: string | null;
  congregation_id?: string | null;
  status: CalendarStatus;
  group_id?: string | null;
  responsible_member_id?: string | null;
  created_at: Date;
  updated_at: Date;
  created_by?: string | null;
  // Relacionamentos (via joins)
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
  // Participantes
  participants?: CalendarParticipant[];
}

export interface CalendarParticipant {
  id: string;
  calendar_item_id: string;
  member_id?: string | null;
  guest_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  guest_whatsapp?: string | null;
  created_at: Date;
  updated_at: Date;
  // Relacionamento (via join)
  member?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
  } | null;
}

export interface CreateParticipantData {
  member_id?: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  guest_whatsapp?: string;
} 