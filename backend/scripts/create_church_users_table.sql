-- Script para criar tabela de usuários por igreja (multiusuário)
-- Execute este script no Supabase SQL Editor ANTES do migrate_church_users_owners.sql
-- Permite que uma igreja tenha vários usuários com papéis: owner, admin, editor, reader.

-- 1. Criar tipos ENUM para papel e status
DO $$ BEGIN
  CREATE TYPE church_user_role AS ENUM ('owner', 'admin', 'editor', 'reader');
EXCEPTION
  WHEN duplicate_object THEN NULL; -- já existe
END $$;

DO $$ BEGIN
  CREATE TYPE church_user_status AS ENUM ('active', 'invited', 'disabled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Criar tabela church_users
CREATE TABLE IF NOT EXISTS public.church_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role church_user_role NOT NULL,
  status church_user_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Um usuário só pode pertencer a uma igreja (sem multi-igreja)
  CONSTRAINT uq_church_users_user_id UNIQUE (user_id),
  -- Evitar duplicata (church_id, user_id)
  CONSTRAINT uq_church_users_church_user UNIQUE (church_id, user_id)
);

-- 3. Índices para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_church_users_church_id ON public.church_users(church_id);
CREATE INDEX IF NOT EXISTS idx_church_users_user_id ON public.church_users(user_id);
CREATE INDEX IF NOT EXISTS idx_church_users_status ON public.church_users(status);

-- 4. Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_church_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger para updated_at
DROP TRIGGER IF EXISTS trigger_update_church_users_updated_at ON public.church_users;
CREATE TRIGGER trigger_update_church_users_updated_at
  BEFORE UPDATE ON public.church_users
  FOR EACH ROW
  EXECUTE FUNCTION update_church_users_updated_at();

-- 6. Comentários para documentação
COMMENT ON TABLE public.church_users IS 'Associação usuário ↔ igreja com papel (owner, admin, editor, reader). Um usuário pertence a no máximo uma igreja.';
COMMENT ON COLUMN public.church_users.church_id IS 'Igreja à qual o usuário tem acesso';
COMMENT ON COLUMN public.church_users.user_id IS 'Usuário Supabase Auth (auth.users)';
COMMENT ON COLUMN public.church_users.role IS 'owner: dono; admin: config + Stripe; editor: CRUD dados; reader: só leitura';
COMMENT ON COLUMN public.church_users.status IS 'active, invited ou disabled';
