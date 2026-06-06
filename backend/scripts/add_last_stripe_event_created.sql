-- Ordenação de webhooks Stripe (ACHADO-W05)
-- Executar no Supabase SQL Editor

ALTER TABLE churches
ADD COLUMN IF NOT EXISTS last_stripe_event_created BIGINT NULL;

ALTER TABLE pending_subscriptions
ADD COLUMN IF NOT EXISTS last_stripe_event_created BIGINT NULL;

COMMENT ON COLUMN churches.last_stripe_event_created IS 'Unix timestamp (event.created) do último webhook Stripe aplicado';
COMMENT ON COLUMN pending_subscriptions.last_stripe_event_created IS 'Unix timestamp (event.created) do último webhook Stripe aplicado';
