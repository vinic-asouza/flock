-- DEV-115: Groups → Ministries (MVP)
-- Keep type = 'Ministério'; hard-delete other group types.
-- member_groups CASCADE; calendar_items.group_id SET NULL (existing FK).

DELETE FROM public.groups
WHERE type IS DISTINCT FROM 'Ministério';

DROP INDEX IF EXISTS public.idx_groups_duplicate_check;
DROP INDEX IF EXISTS public.idx_groups_ordering;
DROP INDEX IF EXISTS public.idx_groups_type;

ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_type_check;
ALTER TABLE public.groups DROP COLUMN IF EXISTS type;

CREATE INDEX idx_groups_duplicate_check
  ON public.groups USING btree (church_id, name, status, congregation_id);

CREATE INDEX idx_groups_ordering
  ON public.groups USING btree (church_id, name);
