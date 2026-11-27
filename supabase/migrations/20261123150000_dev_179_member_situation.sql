-- DEV-179: Situação do membro (ativo, inativo, transferido, desligado, falecido).
-- Mantém `active` como booleano derivado para cota/filtros existentes.

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS situation text,
  ADD COLUMN IF NOT EXISTS situation_changed_at timestamptz;

-- Backfill a partir de active (null/true → ativo; false → inativo)
UPDATE public.members
SET
  situation = CASE
    WHEN active IS DISTINCT FROM false THEN 'ativo'
    ELSE 'inativo'
  END,
  situation_changed_at = COALESCE(created_at, now())
WHERE situation IS NULL;

ALTER TABLE public.members
  ALTER COLUMN situation SET DEFAULT 'ativo',
  ALTER COLUMN situation SET NOT NULL,
  ALTER COLUMN situation_changed_at SET DEFAULT now(),
  ALTER COLUMN situation_changed_at SET NOT NULL;

ALTER TABLE public.members
  DROP CONSTRAINT IF EXISTS members_situation_check;

ALTER TABLE public.members
  ADD CONSTRAINT members_situation_check
  CHECK (situation IN ('ativo', 'inativo', 'transferido', 'desligado', 'falecido'));

-- Alinha active ao valor derivado (defensivo pós-backfill)
UPDATE public.members
SET active = (situation = 'ativo')
WHERE active IS DISTINCT FROM (situation = 'ativo');
