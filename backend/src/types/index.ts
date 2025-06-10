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
  created_at: Date;
}

export interface Member {
  id: string;
  church_id: string;
  name: string;
  birth: Date;
  gender: 'Masculino' | 'Feminino' | 'Outro';
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
  role?: string;
  occupation?: string;
  admission?: string;
  admission_date?: Date;
  congregation?: string;
  active: boolean;
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
  name: string;
  denomination: string;
  address: string;
  city: string;
  state: string;
  cnpj: string;
} 