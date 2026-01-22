-- Script para adicionar campos de recorrência detalhados à tabela calendar_items
-- Execute este script no Supabase SQL Editor

-- Adicionar novos campos para recorrência
ALTER TABLE calendar_items
ADD COLUMN IF NOT EXISTS recurrence_time TIME,
ADD COLUMN IF NOT EXISTS recurrence_duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS recurrence_day_of_week INTEGER CHECK (recurrence_day_of_week >= 0 AND recurrence_day_of_week <= 6), -- 0 = Domingo, 6 = Sábado
ADD COLUMN IF NOT EXISTS recurrence_day_of_month INTEGER CHECK (recurrence_day_of_month >= 1 AND recurrence_day_of_month <= 31),
ADD COLUMN IF NOT EXISTS recurrence_week_of_month INTEGER CHECK (recurrence_week_of_month >= -1 AND recurrence_week_of_month <= 4); -- -1 = último, 1-4 = primeira a quarta semana

-- Comentários para documentação
COMMENT ON COLUMN calendar_items.recurrence_time IS 'Horário do evento recorrente (formato TIME)';
COMMENT ON COLUMN calendar_items.recurrence_duration_minutes IS 'Duração do evento em minutos (opcional)';
COMMENT ON COLUMN calendar_items.recurrence_day_of_week IS 'Dia da semana para recorrência semanal (0=Domingo, 6=Sábado)';
COMMENT ON COLUMN calendar_items.recurrence_day_of_month IS 'Dia do mês para recorrência mensal (1-31)';
COMMENT ON COLUMN calendar_items.recurrence_week_of_month IS 'Semana do mês para recorrência mensal customizada (-1=última, 1-4=primeira a quarta semana)';
