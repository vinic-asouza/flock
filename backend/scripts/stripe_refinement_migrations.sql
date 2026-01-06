-- ============================================
-- Scripts SQL para Refinamento do Stripe
-- ============================================
-- Execute estes scripts na ordem apresentada
-- ============================================

-- ============================================
-- 1. Tabela para Rastrear Webhooks Processados (Idempotência)
-- ============================================
-- Necessário para: Item 2 (Idempotência nos Webhooks)

CREATE TABLE IF NOT EXISTS processed_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_stripe_event_id 
ON processed_webhook_events(stripe_event_id);

-- Índice para limpeza periódica (eventos antigos)
CREATE INDEX IF NOT EXISTS idx_processed_webhook_created_at 
ON processed_webhook_events(created_at);

-- Comentários
COMMENT ON TABLE processed_webhook_events IS 'Rastreia eventos do Stripe já processados para garantir idempotência';
COMMENT ON COLUMN processed_webhook_events.stripe_event_id IS 'ID único do evento do Stripe (usado como chave de idempotência)';
COMMENT ON COLUMN processed_webhook_events.event_type IS 'Tipo do evento (ex: checkout.session.completed)';

-- ============================================
-- 2. Índices para Otimização de Queries
-- ============================================
-- Necessário para: Item 12 (Otimizar Queries)

-- Índice para buscar igreja por customer_id do Stripe
CREATE INDEX IF NOT EXISTS idx_churches_stripe_customer_id 
ON churches(stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;

-- Índice para buscar igreja por subscription_id do Stripe
CREATE INDEX IF NOT EXISTS idx_churches_stripe_subscription_id 
ON churches(stripe_subscription_id) 
WHERE stripe_subscription_id IS NOT NULL;

-- Índice composto para sincronização (user_id + subscription_status)
CREATE INDEX IF NOT EXISTS idx_churches_user_subscription 
ON churches(user_id, subscription_status) 
WHERE subscription_status IS NOT NULL;

-- Índice para buscar assinaturas pendentes por email
CREATE INDEX IF NOT EXISTS idx_pending_subscriptions_email 
ON pending_subscriptions(email);

-- Índice para limpeza de assinaturas pendentes expiradas
CREATE INDEX IF NOT EXISTS idx_pending_subscriptions_expires_at 
ON pending_subscriptions(expires_at);

-- ============================================
-- 3. Função para Limpeza Automática de Webhooks Antigos
-- ============================================
-- Necessário para: Item 2 (Manutenção)

-- Remover função existente se houver (necessário se o tipo de retorno mudou)
DROP FUNCTION IF EXISTS cleanup_old_webhook_events();

CREATE FUNCTION cleanup_old_webhook_events()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Deletar eventos processados há mais de 90 dias
  DELETE FROM processed_webhook_events
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_webhook_events() IS 'Remove eventos de webhook processados há mais de 90 dias';

-- ============================================
-- 4. Função para Limpeza de Assinaturas Pendentes Expiradas
-- ============================================
-- Necessário para: Item 10 (Limpeza Automática)

-- Remover função existente se houver (necessário se o tipo de retorno mudou)
DROP FUNCTION IF EXISTS cleanup_expired_pending_subscriptions();

CREATE FUNCTION cleanup_expired_pending_subscriptions()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Deletar assinaturas pendentes expiradas (mais de 7 dias)
  DELETE FROM pending_subscriptions
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_expired_pending_subscriptions() IS 'Remove assinaturas pendentes expiradas (mais de 7 dias)';

-- ============================================
-- 5. View para Monitoramento de Assinaturas
-- ============================================
-- Útil para: Monitoramento e debugging

CREATE OR REPLACE VIEW vw_subscription_status AS
SELECT 
  c.id as church_id,
  c.name as church_name,
  c.plan_type,
  c.subscription_status,
  c.stripe_customer_id,
  c.stripe_subscription_id,
  c.subscription_start_date,
  c.subscription_end_date,
  CASE 
    WHEN c.subscription_status = 'canceled' AND c.subscription_end_date IS NOT NULL 
      AND c.subscription_end_date > NOW() THEN 'Cancelada (Ativa até término)'
    WHEN c.subscription_status = 'canceled' AND 
      (c.subscription_end_date IS NULL OR c.subscription_end_date <= NOW()) THEN 'Cancelada (Expirada)'
    WHEN c.subscription_status = 'active' THEN 'Ativa'
    WHEN c.subscription_status = 'past_due' THEN 'Pagamento Atrasado'
    WHEN c.subscription_status = 'trialing' THEN 'Período de Teste'
    ELSE c.subscription_status
  END as status_display,
  CASE
    WHEN c.subscription_status = 'canceled' AND 
      (c.subscription_end_date IS NULL OR c.subscription_end_date <= NOW()) 
      AND c.plan_type != '100' THEN '⚠️ Deveria ser plano 100'
    WHEN c.subscription_status = 'active' AND c.plan_type = '100' THEN '⚠️ Plano gratuito com status ativo'
    ELSE 'OK'
  END as validation_status
FROM churches c
WHERE c.stripe_customer_id IS NOT NULL;

COMMENT ON VIEW vw_subscription_status IS 'View para monitoramento e validação de status de assinaturas';

-- ============================================
-- 6. Verificação de Integridade de Dados
-- ============================================
-- Útil para: Validação periódica

CREATE OR REPLACE FUNCTION validate_subscription_integrity()
RETURNS TABLE(
  church_id UUID,
  issue_type TEXT,
  description TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  -- Igrejas com assinatura cancelada e expirada mas plan_type não é 100
  SELECT 
    c.id,
    'canceled_not_free'::TEXT,
    'Assinatura cancelada e expirada mas plan_type não é 100'::TEXT
  FROM churches c
  WHERE c.subscription_status = 'canceled'
    AND c.subscription_end_date IS NOT NULL
    AND c.subscription_end_date <= NOW()
    AND c.plan_type != '100'
    AND c.plan_type IS NOT NULL
  
  UNION ALL
  
  -- Igrejas com status ativo mas plan_type é 100 (sem assinatura paga)
  SELECT 
    c.id,
    'active_free_plan'::TEXT,
    'Status ativo mas plan_type é 100 (deveria ter assinatura paga)'::TEXT
  FROM churches c
  WHERE c.subscription_status = 'active'
    AND c.plan_type = '100'
    AND c.stripe_subscription_id IS NOT NULL
  
  UNION ALL
  
  -- Igrejas com subscription_id mas sem customer_id
  SELECT 
    c.id,
    'subscription_without_customer'::TEXT,
    'Tem subscription_id mas não tem customer_id'::TEXT
  FROM churches c
  WHERE c.stripe_subscription_id IS NOT NULL
    AND c.stripe_customer_id IS NULL;
END;
$$;

COMMENT ON FUNCTION validate_subscription_integrity() IS 'Valida integridade dos dados de assinatura e retorna inconsistências';

-- ============================================
-- 7. Estatísticas de Webhooks
-- ============================================
-- Útil para: Monitoramento

CREATE OR REPLACE VIEW vw_webhook_stats AS
SELECT 
  event_type,
  COUNT(*) as total_processed,
  COUNT(DISTINCT stripe_event_id) as unique_events,
  MIN(processed_at) as first_processed,
  MAX(processed_at) as last_processed,
  COUNT(*) FILTER (WHERE processed_at > NOW() - INTERVAL '24 hours') as last_24h,
  COUNT(*) FILTER (WHERE processed_at > NOW() - INTERVAL '7 days') as last_7d
FROM processed_webhook_events
GROUP BY event_type
ORDER BY total_processed DESC;

COMMENT ON VIEW vw_webhook_stats IS 'Estatísticas de processamento de webhooks';

-- ============================================
-- 8. Rollback (se necessário)
-- ============================================

-- Para reverter as mudanças, execute:
/*
DROP VIEW IF EXISTS vw_webhook_stats;
DROP VIEW IF EXISTS vw_subscription_status;
DROP FUNCTION IF EXISTS validate_subscription_integrity();
DROP FUNCTION IF EXISTS cleanup_expired_pending_subscriptions();
DROP FUNCTION IF EXISTS cleanup_old_webhook_events();
DROP INDEX IF EXISTS idx_pending_subscriptions_expires_at;
DROP INDEX IF EXISTS idx_pending_subscriptions_email;
DROP INDEX IF EXISTS idx_churches_user_subscription;
DROP INDEX IF EXISTS idx_churches_stripe_subscription_id;
DROP INDEX IF EXISTS idx_churches_stripe_customer_id;
DROP INDEX IF EXISTS idx_processed_webhook_created_at;
DROP INDEX IF EXISTS idx_stripe_event_id;
DROP TABLE IF EXISTS processed_webhook_events;
*/

-- ============================================
-- FIM DOS SCRIPTS
-- ============================================
