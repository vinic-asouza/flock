-- OB12 Ciclo 3: contexto de processamento em processed_webhook_events
-- Aplicar em flock-app-01 via Supabase SQL editor ou MCP

ALTER TABLE public.processed_webhook_events
  ADD COLUMN IF NOT EXISTS church_id uuid REFERENCES public.churches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS processing_ms integer,
  ADD COLUMN IF NOT EXISTS outcome text DEFAULT 'processing'
    CHECK (outcome IN ('processing', 'success', 'released', 'failed'));

CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_outcome
  ON public.processed_webhook_events(outcome);

CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_church_id
  ON public.processed_webhook_events(church_id)
  WHERE church_id IS NOT NULL;

COMMENT ON COLUMN public.processed_webhook_events.outcome IS
  'processing=claim ativo; success=handler ok; released=falha com retry permitido';
