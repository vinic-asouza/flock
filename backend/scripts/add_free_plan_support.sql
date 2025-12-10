-- Script para adicionar suporte ao plano gratuito (100 membros)
-- Execute este script no Supabase SQL Editor

-- Atualizar constraint para incluir o plano gratuito (100)
ALTER TABLE churches
DROP CONSTRAINT IF EXISTS check_plan_type_valid;

ALTER TABLE churches
ADD CONSTRAINT check_plan_type_valid
CHECK (plan_type IS NULL OR plan_type IN ('100', '200', '500', '800', 'custom'));

-- Atualizar comentário da coluna
COMMENT ON COLUMN churches.plan_type IS 'Tipo de plano: 100 (gratuito), 200, 500, 800 ou custom';

