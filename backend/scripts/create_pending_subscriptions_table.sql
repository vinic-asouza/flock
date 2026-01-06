-- Script para criar tabela de assinaturas pendentes
-- Execute este script no Supabase SQL Editor

-- Criar tabela de assinaturas pendentes
CREATE TABLE IF NOT EXISTS pending_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  stripe_customer_id VARCHAR(255) NOT NULL,
  stripe_subscription_id VARCHAR(255) NOT NULL,
  plan_type VARCHAR(20) NOT NULL,
  subscription_status VARCHAR(50) NOT NULL,
  subscription_start_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days'
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_pending_subscriptions_email ON pending_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_pending_subscriptions_stripe_customer_id ON pending_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_pending_subscriptions_stripe_subscription_id ON pending_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_pending_subscriptions_expires_at ON pending_subscriptions(expires_at);

-- Adicionar constraint para valores válidos de plano
ALTER TABLE pending_subscriptions
DROP CONSTRAINT IF EXISTS check_pending_plan_type_valid;

ALTER TABLE pending_subscriptions
ADD CONSTRAINT check_pending_plan_type_valid
CHECK (plan_type IN ('100', '200', '500', '800'));

-- Adicionar constraint para valores válidos de status
ALTER TABLE pending_subscriptions
DROP CONSTRAINT IF EXISTS check_pending_subscription_status_valid;

ALTER TABLE pending_subscriptions
ADD CONSTRAINT check_pending_subscription_status_valid
CHECK (subscription_status IN (
  'active',
  'canceled',
  'past_due',
  'unpaid',
  'incomplete',
  'incomplete_expired',
  'trialing',
  'paused'
));

-- Criar função para limpar assinaturas expiradas (opcional, pode ser executada periodicamente)
CREATE OR REPLACE FUNCTION cleanup_expired_pending_subscriptions()
RETURNS void AS $$
BEGIN
  DELETE FROM pending_subscriptions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comentários para documentação
COMMENT ON TABLE pending_subscriptions IS 'Tabela para armazenar assinaturas do Stripe que aguardam vinculação com uma igreja';
COMMENT ON COLUMN pending_subscriptions.email IS 'Email do cliente que fez o checkout (usado para vincular quando criar conta)';
COMMENT ON COLUMN pending_subscriptions.stripe_customer_id IS 'ID do cliente no Stripe';
COMMENT ON COLUMN pending_subscriptions.stripe_subscription_id IS 'ID da assinatura no Stripe';
COMMENT ON COLUMN pending_subscriptions.plan_type IS 'Tipo de plano: 100 (gratuito), 200, 500 ou 800';
COMMENT ON COLUMN pending_subscriptions.subscription_status IS 'Status da assinatura no Stripe';
COMMENT ON COLUMN pending_subscriptions.expires_at IS 'Data de expiração da assinatura pendente (7 dias após criação)';

