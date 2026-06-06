-- MT04: Garantir 1 stripe_customer_id / stripe_subscription_id por igreja
-- Executar após saneamento de duplicatas (ver dev-report)

CREATE UNIQUE INDEX IF NOT EXISTS idx_churches_stripe_customer_id_unique
  ON churches (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_churches_stripe_subscription_id_unique
  ON churches (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
