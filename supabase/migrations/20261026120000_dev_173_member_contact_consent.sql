-- DEV-173: contato de menor, consentimento de comunicação e revisão de duplicidade.
-- Aditiva. Cadastros antigos ficam sem consentimento (NULL) e sem flag de revisão.

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS minor_without_own_contact boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS communication_consent_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS communication_consent_source text NULL,
  ADD COLUMN IF NOT EXISTS duplicate_review_pending boolean NOT NULL DEFAULT false;

ALTER TABLE public.members
  DROP CONSTRAINT IF EXISTS members_communication_consent_source_check;

ALTER TABLE public.members
  ADD CONSTRAINT members_communication_consent_source_check
  CHECK (
    communication_consent_source IS NULL
    OR communication_consent_source IN ('internal', 'public', 'import')
  );

ALTER TABLE public.members
  DROP CONSTRAINT IF EXISTS members_communication_consent_pair_check;

ALTER TABLE public.members
  ADD CONSTRAINT members_communication_consent_pair_check
  CHECK (
    (communication_consent_at IS NULL) = (communication_consent_source IS NULL)
  );
