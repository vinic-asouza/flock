import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; // Public anon key para operações comuns
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service Role Key para operações admin

if (!supabaseUrl || !supabaseKey) {
  throw new Error('As variáveis de ambiente SUPABASE_URL e SUPABASE_KEY são obrigatórias');
}

// Cliente padrão (anon) para operações comuns
export const supabase = createClient(supabaseUrl, supabaseKey);

// Cliente admin (service role) para operações privilegiadas como deleteUser
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

export default supabase;