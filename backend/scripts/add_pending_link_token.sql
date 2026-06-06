-- MT09: Token de vínculo checkout landing → registro

ALTER TABLE pending_subscriptions
  ADD COLUMN IF NOT EXISTS link_token UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_subscriptions_link_token_unique
  ON pending_subscriptions (link_token)
  WHERE link_token IS NOT NULL;

COMMENT ON COLUMN pending_subscriptions.link_token IS 'Token único para vincular checkout landing ao registro';
