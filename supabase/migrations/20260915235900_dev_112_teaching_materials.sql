-- DEV-112: Materiais e links da Turma (teaching_materials)
-- Validar localmente; não aplicar no live sem confirmação.

CREATE TABLE IF NOT EXISTS public.teaching_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.teaching_classes(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  url text,
  content text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teaching_materials_type_check CHECK (
    type = ANY (ARRAY['link'::text, 'note'::text])
  ),
  CONSTRAINT teaching_materials_title_len CHECK (
    (char_length(TRIM(BOTH FROM title)) >= 2) AND (char_length(title) <= 120)
  ),
  CONSTRAINT teaching_materials_type_fields_check CHECK (
    (
      (type = 'link'::text)
      AND (url IS NOT NULL)
      AND (char_length(TRIM(BOTH FROM url)) > 0)
      AND (content IS NULL)
    )
    OR (
      (type = 'note'::text)
      AND (content IS NOT NULL)
      AND (char_length(TRIM(BOTH FROM content)) > 0)
      AND (url IS NULL)
    )
  ),
  CONSTRAINT teaching_materials_url_len CHECK (
    (url IS NULL) OR (char_length(url) <= 2048)
  ),
  CONSTRAINT teaching_materials_content_len CHECK (
    (content IS NULL) OR (char_length(content) <= 5000)
  )
);

CREATE INDEX IF NOT EXISTS teaching_materials_church_id_idx
  ON public.teaching_materials (church_id);

CREATE INDEX IF NOT EXISTS teaching_materials_class_updated_idx
  ON public.teaching_materials (class_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS teaching_materials_class_type_idx
  ON public.teaching_materials (class_id, type);
