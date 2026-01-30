-- Script para adicionar ON DELETE nas foreign keys do módulo de congregações
-- Execute este script no Supabase SQL Editor
--
-- IMPORTANTE: Este script modifica constraints existentes
-- Certifique-se de fazer backup antes de executar

-- ============================================
-- 1. Tabela congregations
-- ============================================

-- Adicionar ON DELETE CASCADE para church_id
-- Se a igreja for deletada, todas as congregações serão deletadas automaticamente
ALTER TABLE public.congregations
  DROP CONSTRAINT IF EXISTS congregations_church_id_fkey;

ALTER TABLE public.congregations
  ADD CONSTRAINT congregations_church_id_fkey 
  FOREIGN KEY (church_id) 
  REFERENCES public.churches(id) 
  ON DELETE CASCADE;

-- ============================================
-- 2. Tabela members
-- ============================================

-- Adicionar ON DELETE SET NULL para congregation_id
-- Se a congregação for deletada, os membros terão congregation_id = NULL (Sede)
ALTER TABLE public.members
  DROP CONSTRAINT IF EXISTS members_congregation_id_fkey;

ALTER TABLE public.members
  ADD CONSTRAINT members_congregation_id_fkey 
  FOREIGN KEY (congregation_id) 
  REFERENCES public.congregations(id) 
  ON DELETE SET NULL;

-- ============================================
-- 3. Tabela integration_members
-- ============================================

-- Adicionar ON DELETE SET NULL para expected_congregation_id
-- Se a congregação for deletada, expected_congregation_id será NULL
ALTER TABLE public.integration_members
  DROP CONSTRAINT IF EXISTS integration_members_expected_congregation_id_fkey;

ALTER TABLE public.integration_members
  ADD CONSTRAINT integration_members_expected_congregation_id_fkey 
  FOREIGN KEY (expected_congregation_id) 
  REFERENCES public.congregations(id) 
  ON DELETE SET NULL;

-- ============================================
-- 4. Tabela public_registration_links
-- ============================================

-- Adicionar ON DELETE SET NULL para default_congregation_id
-- Se a congregação for deletada, default_congregation_id será NULL
ALTER TABLE public.public_registration_links
  DROP CONSTRAINT IF EXISTS public_registration_links_default_congregation_id_fkey;

ALTER TABLE public.public_registration_links
  ADD CONSTRAINT public_registration_links_default_congregation_id_fkey 
  FOREIGN KEY (default_congregation_id) 
  REFERENCES public.congregations(id) 
  ON DELETE SET NULL;

-- ============================================
-- Verificação (opcional - descomente para verificar)
-- ============================================

-- SELECT 
--   tc.table_name, 
--   tc.constraint_name, 
--   tc.constraint_type,
--   kcu.column_name,
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name,
--   rc.delete_rule
-- FROM information_schema.table_constraints AS tc 
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
--   AND tc.table_schema = kcu.table_schema
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
--   AND ccu.table_schema = tc.table_schema
-- LEFT JOIN information_schema.referential_constraints AS rc
--   ON rc.constraint_name = tc.constraint_name
--   AND rc.constraint_schema = tc.table_schema
-- WHERE tc.table_schema = 'public'
--   AND (tc.table_name IN ('congregations', 'members', 'integration_members', 'public_registration_links')
--     OR ccu.table_name = 'congregations')
--   AND tc.constraint_type = 'FOREIGN KEY'
-- ORDER BY tc.table_name, tc.constraint_name;
