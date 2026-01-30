-- Script para adicionar ON DELETE nas foreign keys do módulo de calendário
-- Execute este script no Supabase SQL Editor

-- ============================================
-- 1. Tabela calendar_items
-- ============================================

-- Remover constraint antiga e adicionar nova com ON DELETE CASCADE para church_id
ALTER TABLE public.calendar_items
  DROP CONSTRAINT IF EXISTS calendar_items_church_id_fkey;

ALTER TABLE public.calendar_items
  ADD CONSTRAINT calendar_items_church_id_fkey 
  FOREIGN KEY (church_id) 
  REFERENCES public.churches(id) 
  ON DELETE CASCADE;

-- Remover constraint antiga e adicionar nova com ON DELETE SET NULL para congregation_id
ALTER TABLE public.calendar_items
  DROP CONSTRAINT IF EXISTS calendar_items_congregation_id_fkey;

ALTER TABLE public.calendar_items
  ADD CONSTRAINT calendar_items_congregation_id_fkey 
  FOREIGN KEY (congregation_id) 
  REFERENCES public.congregations(id) 
  ON DELETE SET NULL;

-- Remover constraint antiga e adicionar nova com ON DELETE SET NULL para group_id
ALTER TABLE public.calendar_items
  DROP CONSTRAINT IF EXISTS calendar_items_group_id_fkey;

ALTER TABLE public.calendar_items
  ADD CONSTRAINT calendar_items_group_id_fkey 
  FOREIGN KEY (group_id) 
  REFERENCES public.groups(id) 
  ON DELETE SET NULL;

-- Remover constraint antiga e adicionar nova com ON DELETE SET NULL para responsible_member_id
ALTER TABLE public.calendar_items
  DROP CONSTRAINT IF EXISTS calendar_items_responsible_member_id_fkey;

ALTER TABLE public.calendar_items
  ADD CONSTRAINT calendar_items_responsible_member_id_fkey 
  FOREIGN KEY (responsible_member_id) 
  REFERENCES public.members(id) 
  ON DELETE SET NULL;

-- ============================================
-- 2. Tabela calendar_participants
-- ============================================

-- Remover constraint antiga e adicionar nova com ON DELETE CASCADE para calendar_item_id
ALTER TABLE public.calendar_participants
  DROP CONSTRAINT IF EXISTS calendar_participants_calendar_item_id_fkey;

ALTER TABLE public.calendar_participants
  ADD CONSTRAINT calendar_participants_calendar_item_id_fkey 
  FOREIGN KEY (calendar_item_id) 
  REFERENCES public.calendar_items(id) 
  ON DELETE CASCADE;

-- Remover constraint antiga e adicionar nova com ON DELETE SET NULL para member_id
ALTER TABLE public.calendar_participants
  DROP CONSTRAINT IF EXISTS calendar_participants_member_id_fkey;

ALTER TABLE public.calendar_participants
  ADD CONSTRAINT calendar_participants_member_id_fkey 
  FOREIGN KEY (member_id) 
  REFERENCES public.members(id) 
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
--   AND tc.table_name IN ('calendar_items', 'calendar_participants')
--   AND tc.constraint_type = 'FOREIGN KEY'
-- ORDER BY tc.table_name, tc.constraint_name;
