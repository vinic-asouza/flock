-- Criar tabela de participantes de itens de calendário
CREATE TABLE IF NOT EXISTS calendar_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calendar_item_id UUID NOT NULL REFERENCES calendar_items(id) ON DELETE CASCADE,
  
  -- Participante membro (se for membro registrado)
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  
  -- Participante convidado (se for alguém não registrado)
  guest_name VARCHAR(255),
  guest_email VARCHAR(255),
  guest_phone VARCHAR(20),
  guest_whatsapp VARCHAR(20),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: deve ser OU membro OU convidado, não ambos
  CONSTRAINT participant_type_check CHECK (
    (member_id IS NOT NULL AND guest_name IS NULL) OR
    (member_id IS NULL AND guest_name IS NOT NULL)
  ),
  
  -- Evitar duplicatas de membros no mesmo evento
  CONSTRAINT unique_member_per_event UNIQUE (calendar_item_id, member_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_calendar_participants_item ON calendar_participants(calendar_item_id);
CREATE INDEX IF NOT EXISTS idx_calendar_participants_member ON calendar_participants(member_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_calendar_participants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_calendar_participants_updated_at
  BEFORE UPDATE ON calendar_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_participants_updated_at();

-- Comentários
COMMENT ON TABLE calendar_participants IS 'Participantes de itens do calendário (membros ou convidados)';
COMMENT ON COLUMN calendar_participants.member_id IS 'ID do membro participante (se for membro registrado)';
COMMENT ON COLUMN calendar_participants.guest_name IS 'Nome do convidado (se não for membro registrado)';
