import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('As variáveis de ambiente SUPABASE_URL e SUPABASE_KEY são obrigatórias');
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY é obrigatória. ' +
    'Todas as tabelas public usam RLS (deny_anon) e requerem service_role para acesso server-side.'
  );
}

// Cliente anon — usado exclusivamente para supabase.auth.* (signUp, signIn, getUser, etc.)
export const supabase = createClient(supabaseUrl, supabaseKey);

// Cliente service_role — usado para TODAS as queries PostgREST (.from, .rpc) no backend (bypassa RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

/** Alias semântico para queries de banco no backend. */
export const db = supabaseAdmin;

export default supabase;