-- Script para criar índices otimizados para o módulo de congregações
-- Execute este script no Supabase SQL Editor
--
-- IMPORTANTE: Este script usa CREATE INDEX IF NOT EXISTS para evitar erros
-- se os índices já existirem

-- ============================================
-- 1. Tabela congregations - Índices
-- ============================================

-- Índice para church_id (filtro frequente)
CREATE INDEX IF NOT EXISTS idx_congregations_church_id 
ON congregations(church_id);

-- Índice para name (busca e ordenação)
CREATE INDEX IF NOT EXISTS idx_congregations_name 
ON congregations(name);

-- Índice composto para busca por igreja e nome (otimiza queries com filtro + ordenação)
CREATE INDEX IF NOT EXISTS idx_congregations_church_name 
ON congregations(church_id, name);

-- Índice para state (pode ser útil para relatórios e filtros)
CREATE INDEX IF NOT EXISTS idx_congregations_state 
ON congregations(state);

-- ============================================
-- 2. Índices relacionados em outras tabelas
-- ============================================

-- Índice para members.congregation_id (já deve existir, mas garantindo)
-- Este índice é crítico para performance das queries de contagem de membros
CREATE INDEX IF NOT EXISTS idx_members_congregation_id 
ON members(congregation_id) 
WHERE congregation_id IS NOT NULL;

-- Índice composto para members (church_id + congregation_id + active)
-- Otimiza queries de contagem de membros ativos por congregação
CREATE INDEX IF NOT EXISTS idx_members_church_congregation_active 
ON members(church_id, congregation_id, active) 
WHERE active = true AND congregation_id IS NOT NULL;

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
--   AND (tablename = 'congregations' 
--     OR (tablename = 'members' AND indexname LIKE '%congregation%'))
-- ORDER BY tablename, indexname;
