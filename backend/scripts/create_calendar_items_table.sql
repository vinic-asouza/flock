-- Script para criar tabela de itens do calendário
-- Execute este script no Supabase SQL Editor

-- 1. Criar tabela calendar_items
CREATE TABLE IF NOT EXISTS calendar_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  
  -- Campos essenciais
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Programação', 'Evento', 'Encontro', 'Reunião')),
  description TEXT,
  
  -- Datas
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT CHECK (recurrence_pattern IN ('weekly', 'monthly', 'custom')),
  recurrence_end_date TIMESTAMP WITH TIME ZONE,
  
  -- Localização
  location TEXT,
  congregation_id UUID REFERENCES congregations(id) ON DELETE SET NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'postponed')),
  
  -- Vínculos
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  responsible_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_calendar_items_church_id ON calendar_items(church_id);
CREATE INDEX IF NOT EXISTS idx_calendar_items_start_date ON calendar_items(start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_items_congregation_id ON calendar_items(congregation_id);
CREATE INDEX IF NOT EXISTS idx_calendar_items_group_id ON calendar_items(group_id);
CREATE INDEX IF NOT EXISTS idx_calendar_items_type ON calendar_items(type);
CREATE INDEX IF NOT EXISTS idx_calendar_items_status ON calendar_items(status);
CREATE INDEX IF NOT EXISTS idx_calendar_items_is_recurring ON calendar_items(is_recurring);

-- 3. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_calendar_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_calendar_items_updated_at ON calendar_items;
CREATE TRIGGER trigger_update_calendar_items_updated_at
  BEFORE UPDATE ON calendar_items
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_items_updated_at();

-- 5. Comentários para documentação
COMMENT ON TABLE calendar_items IS 'Tabela para armazenar itens do calendário (programações, eventos, encontros e reuniões)';
COMMENT ON COLUMN calendar_items.id IS 'ID único do item do calendário';
COMMENT ON COLUMN calendar_items.church_id IS 'ID da igreja (multi-tenancy)';
COMMENT ON COLUMN calendar_items.title IS 'Título do item do calendário';
COMMENT ON COLUMN calendar_items.type IS 'Tipo: Programação, Evento, Encontro ou Reunião';
COMMENT ON COLUMN calendar_items.description IS 'Descrição detalhada do item';
COMMENT ON COLUMN calendar_items.start_date IS 'Data e hora de início';
COMMENT ON COLUMN calendar_items.end_date IS 'Data e hora de fim (opcional)';
COMMENT ON COLUMN calendar_items.is_recurring IS 'Indica se o item é recorrente';
COMMENT ON COLUMN calendar_items.recurrence_pattern IS 'Padrão de recorrência: weekly, monthly ou custom';
COMMENT ON COLUMN calendar_items.recurrence_end_date IS 'Data de término da recorrência';
COMMENT ON COLUMN calendar_items.location IS 'Local do evento (texto livre ou nome da congregação)';
COMMENT ON COLUMN calendar_items.congregation_id IS 'ID da congregação (opcional)';
COMMENT ON COLUMN calendar_items.status IS 'Status: active, cancelled ou postponed';
COMMENT ON COLUMN calendar_items.group_id IS 'ID do grupo/ministério vinculado (opcional)';
COMMENT ON COLUMN calendar_items.responsible_member_id IS 'ID do membro responsável (opcional)';
COMMENT ON COLUMN calendar_items.created_by IS 'ID do usuário que criou o item';
