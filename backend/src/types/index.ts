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

export interface Role {
  id: string;
  church_id: string;
  name: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Child {
  name: string;
  birth?: string;
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
  role_id?: string;
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

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
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
  default_role_id?: string | null;
  notes?: string | null;
}

export interface CreateRegistrationLinkData {
  expires_at: string; // ISO date string
  max_uses?: number | null;
  default_congregation_id?: string | null;
  default_role_id?: string | null;
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