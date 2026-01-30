-- Script para atualizar a constraint de entity na tabela audit_logs
-- Adiciona suporte para 'account' e 'church' além dos existentes

-- Remover constraint antiga
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_entity_check;

-- Adicionar nova constraint com todas as entidades suportadas
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_entity_check 
CHECK (entity = ANY (ARRAY[
  'member'::text, 
  'role'::text, 
  'congregation'::text,
  'integration_member'::text,
  'public_registration_link'::text,
  'public_integration_link'::text,
  'group'::text,
  'calendar_item'::text,
  'account'::text,
  'church'::text
]));

-- Comentário explicativo
COMMENT ON CONSTRAINT audit_logs_entity_check ON audit_logs IS 
'Valida que entity é uma das entidades suportadas pelo sistema de auditoria';
