-- Flock — snapshot parcial de referência (módulo Ensino)
-- Fonte de verdade: schema live no Supabase (projeto flock-app-01).
-- Este arquivo NÃO é o dump completo do banco; espelha apenas teaching_*.
-- Atualizado: 2026-09-13 (DEV-99)

-- ---------------------------------------------------------------------------
-- teaching_programs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teaching_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  congregation_id uuid REFERENCES public.congregations(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teaching_programs_name_len CHECK (
    (char_length(TRIM(BOTH FROM name)) >= 2) AND (char_length(name) <= 100)
  )
);

CREATE INDEX IF NOT EXISTS teaching_programs_church_id_idx
  ON public.teaching_programs (church_id);
CREATE INDEX IF NOT EXISTS teaching_programs_church_name_idx
  ON public.teaching_programs (church_id, name);

-- ---------------------------------------------------------------------------
-- teaching_classes (Turma)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teaching_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.teaching_programs(id) ON DELETE CASCADE,
  congregation_id uuid NOT NULL REFERENCES public.congregations(id) ON DELETE RESTRICT,
  name text NOT NULL,
  location text,
  schedule text,
  status text NOT NULL DEFAULT 'draft',
  responsible_id uuid NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  start_date date NOT NULL,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teaching_classes_name_len CHECK (
    (char_length(TRIM(BOTH FROM name)) >= 2) AND (char_length(name) <= 100)
  ),
  CONSTRAINT teaching_classes_status_check CHECK (
    status = ANY (ARRAY['draft'::text, 'open'::text, 'in_progress'::text, 'closed'::text, 'archived'::text])
  ),
  CONSTRAINT teaching_classes_end_date_check CHECK (
    (end_date IS NULL) OR (end_date >= start_date)
  )
);

CREATE INDEX IF NOT EXISTS teaching_classes_church_id_idx
  ON public.teaching_classes (church_id);
CREATE INDEX IF NOT EXISTS teaching_classes_program_id_idx
  ON public.teaching_classes (program_id);
CREATE INDEX IF NOT EXISTS teaching_classes_congregation_id_idx
  ON public.teaching_classes (congregation_id);
CREATE INDEX IF NOT EXISTS teaching_classes_status_idx
  ON public.teaching_classes (church_id, status);
CREATE INDEX IF NOT EXISTS idx_teaching_classes_church_start_date
  ON public.teaching_classes (church_id, start_date);

-- ---------------------------------------------------------------------------
-- teaching_class_teachers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teaching_class_teachers (
  class_id uuid NOT NULL REFERENCES public.teaching_classes(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, member_id)
);

CREATE INDEX IF NOT EXISTS teaching_class_teachers_member_id_idx
  ON public.teaching_class_teachers (member_id);

-- ---------------------------------------------------------------------------
-- teaching_enrollments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teaching_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.teaching_classes(id) ON DELETE CASCADE,
  kind text NOT NULL,
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  full_name text,
  whatsapp text,
  birth_date date,
  email text,
  match_meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teaching_enrollments_kind_check CHECK (
    kind = ANY (ARRAY['member'::text, 'guest'::text, 'possible_member'::text])
  ),
  CONSTRAINT teaching_enrollments_member_kind_check CHECK (
    ((kind = 'member'::text) AND (member_id IS NOT NULL))
    OR (
      (kind = ANY (ARRAY['guest'::text, 'possible_member'::text]))
      AND (full_name IS NOT NULL)
      AND (whatsapp IS NOT NULL)
      AND (birth_date IS NOT NULL)
    )
  )
);

CREATE INDEX IF NOT EXISTS teaching_enrollments_class_id_idx
  ON public.teaching_enrollments (class_id);
CREATE INDEX IF NOT EXISTS teaching_enrollments_church_kind_idx
  ON public.teaching_enrollments (church_id, kind);
CREATE UNIQUE INDEX IF NOT EXISTS teaching_enrollments_class_member_uidx
  ON public.teaching_enrollments (class_id, member_id)
  WHERE (member_id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- teaching_public_links
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teaching_public_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.teaching_classes(id) ON DELETE CASCADE,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  max_uses integer,
  current_uses integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teaching_public_links_token_key UNIQUE (token),
  CONSTRAINT teaching_public_links_max_uses_check CHECK (
    (max_uses IS NULL) OR (max_uses > 0)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS teaching_public_links_class_uidx
  ON public.teaching_public_links (class_id);
CREATE INDEX IF NOT EXISTS teaching_public_links_church_id_idx
  ON public.teaching_public_links (church_id);
CREATE INDEX IF NOT EXISTS teaching_public_links_token_idx
  ON public.teaching_public_links (token);

-- ---------------------------------------------------------------------------
-- teaching_materials (DEV-112)
-- ---------------------------------------------------------------------------
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
