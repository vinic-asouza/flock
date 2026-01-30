-- Script para adicionar índices na tabela audit_logs
-- Melhora performance de queries frequentes de logs de auditoria

-- Índice composto para queries por church_id e data (mais comum)
CREATE INDEX IF NOT EXISTS idx_audit_logs_church_created 
ON audit_logs(church_id, created_at DESC);

-- Índice composto para queries por church_id, entity e action
CREATE INDEX IF NOT EXISTS idx_audit_logs_church_entity_action 
ON audit_logs(church_id, entity, action);

-- Índice para queries por church_id e entity
CREATE INDEX IF NOT EXISTS idx_audit_logs_church_entity 
ON audit_logs(church_id, entity);

-- Índice para queries por user_id (útil para auditoria de ações de usuários específicos)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
ON audit_logs(user_id, created_at DESC);

-- Índice para queries por entity_id (útil para rastrear histórico de uma entidade específica)
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id 
ON audit_logs(entity, entity_id, created_at DESC);

-- Comentários explicativos
COMMENT ON INDEX idx_audit_logs_church_created IS 'Índice para queries de logs por igreja ordenados por data (mais comum)';
COMMENT ON INDEX idx_audit_logs_church_entity_action IS 'Índice para queries filtradas por igreja, entidade e ação';
COMMENT ON INDEX idx_audit_logs_church_entity IS 'Índice para queries filtradas por igreja e entidade';
COMMENT ON INDEX idx_audit_logs_user_id IS 'Índice para queries de ações de um usuário específico';
COMMENT ON INDEX idx_audit_logs_entity_id IS 'Índice para rastrear histórico de uma entidade específica';
