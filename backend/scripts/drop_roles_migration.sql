-- Migração: remoção da tabela roles e colunas role_id / default_role_id
-- Execute este script no Supabase SQL Editor APÓS garantir que a aplicação
-- já foi atualizada e não utiliza mais roles.
--
-- Ordem: 1) Dropar FKs, 2) Dropar colunas, 3) Dropar tabela

-- 1. Remover FK em members.role_id
ALTER TABLE public.members
  DROP CONSTRAINT IF EXISTS members_role_id_fkey;

-- 2. Remover FK em public_registration_links.default_role_id
ALTER TABLE public.public_registration_links
  DROP CONSTRAINT IF EXISTS public_registration_links_default_role_id_fkey;

-- 3. Remover coluna role_id da tabela members
ALTER TABLE public.members
  DROP COLUMN IF EXISTS role_id;

-- 4. Remover coluna default_role_id da tabela public_registration_links
ALTER TABLE public.public_registration_links
  DROP COLUMN IF EXISTS default_role_id;

-- 5. Remover tabela roles
DROP TABLE IF EXISTS public.roles;
