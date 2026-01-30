-- Script para criar índices compostos otimizados para o módulo de calendário
-- Execute este script no Supabase SQL Editor
-- 
-- IMPORTANTE: Este script usa CREATE INDEX IF NOT EXISTS para evitar erros
-- se os índices já existirem (alguns podem ter sido criados automaticamente)

-- ============================================
-- 1. Tabela calendar_items - Índices Compostos
-- ============================================

-- Índice composto para queries frequentes: church_id + status + start_date
-- Usado em listCalendarItems quando filtra por igreja e status
CREATE INDEX IF NOT EXISTS idx_calendar_items_church_status_date 
ON calendar_items(church_id, status, start_date);

-- Índice composto para filtros por congregação e status
-- Usado quando filtra por congregação específica
CREATE INDEX IF NOT EXISTS idx_calendar_items_congregation_status 
ON calendar_items(congregation_id, status) 
WHERE congregation_id IS NOT NULL;

-- Índice composto para filtros por grupo e status
-- Usado quando filtra por grupo específico
CREATE INDEX IF NOT EXISTS idx_calendar_items_group_status 
ON calendar_items(group_id, status) 
WHERE group_id IS NOT NULL;

-- Índice composto para itens recorrentes
-- Otimiza busca de itens recorrentes que precisam ser expandidos
CREATE INDEX IF NOT EXISTS idx_calendar_items_recurring 
ON calendar_items(church_id, is_recurring, recurrence_pattern, start_date, recurrence_end_date) 
WHERE is_recurring = true;

-- Índice para busca por tipo e status
-- Usado em filtros por tipo de item
CREATE INDEX IF NOT EXISTS idx_calendar_items_type_status 
ON calendar_items(church_id, type, status);

-- ============================================
-- 2. Tabela calendar_participants - Índices Compostos
-- ============================================

-- Índice composto para buscar participantes de um item
-- Já existe idx_calendar_participants_item, mas este é mais específico
-- (o índice simples já cobre bem esta query)

-- Índice composto para verificar duplicatas de membros
-- Otimiza a verificação de membro já participante (usado em addParticipant)
CREATE INDEX IF NOT EXISTS idx_calendar_participants_item_member 
ON calendar_participants(calendar_item_id, member_id) 
WHERE member_id IS NOT NULL;

-- ============================================
-- Verificação (opcional - descomente para verificar)
-- ============================================

-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename IN ('calendar_items', 'calendar_participants')
-- ORDER BY tablename, indexname;
