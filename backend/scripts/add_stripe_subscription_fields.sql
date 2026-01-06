-- Script para adicionar campos de assinatura Stripe na tabela churches
-- Execute este script no Supabase SQL Editor

-- Adicionar campos de assinatura Stripe
ALTER TABLE churches 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_churches_stripe_customer_id ON churches(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_churches_stripe_subscription_id ON churches(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_churches_subscription_status ON churches(subscription_status);
CREATE INDEX IF NOT EXISTS idx_churches_plan_type ON churches(plan_type);

-- Adicionar constraint para valores válidos de status
ALTER TABLE churches
DROP CONSTRAINT IF EXISTS check_subscription_status_valid;

ALTER TABLE churches
ADD CONSTRAINT check_subscription_status_valid
CHECK (subscription_status IS NULL OR subscription_status IN (
  'active',
  'canceled',
  'past_due',
  'unpaid',
  'incomplete',
  'incomplete_expired',
  'trialing',
  'paused'
));

-- Adicionar constraint para valores válidos de plano
ALTER TABLE churches
DROP CONSTRAINT IF EXISTS check_plan_type_valid;

ALTER TABLE churches
ADD CONSTRAINT check_plan_type_valid
CHECK (plan_type IS NULL OR plan_type IN ('100', '200', '500', '800'));

-- Criar função para atualizar subscription_updated_at automaticamente
CREATE OR REPLACE FUNCTION update_church_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id 
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.plan_type IS DISTINCT FROM OLD.plan_type THEN
    NEW.subscription_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar subscription_updated_at
DROP TRIGGER IF EXISTS trigger_update_church_subscription_updated_at ON churches;
CREATE TRIGGER trigger_update_church_subscription_updated_at
  BEFORE UPDATE ON churches
  FOR EACH ROW
  EXECUTE FUNCTION update_church_subscription_updated_at();

-- Comentários para documentação
COMMENT ON COLUMN churches.stripe_customer_id IS 'ID do cliente no Stripe (começa com cus_)';
COMMENT ON COLUMN churches.stripe_subscription_id IS 'ID da assinatura ativa no Stripe (começa com sub_)';
COMMENT ON COLUMN churches.subscription_status IS 'Status da assinatura: active, canceled, past_due, etc.';
COMMENT ON COLUMN churches.plan_type IS 'Tipo de plano: 100 (gratuito), 200, 500 ou 800';
COMMENT ON COLUMN churches.subscription_start_date IS 'Data de início da assinatura';
COMMENT ON COLUMN churches.subscription_end_date IS 'Data de término da assinatura (se cancelada)';
COMMENT ON COLUMN churches.subscription_updated_at IS 'Data da última atualização da assinatura';

