-- Flock — snapshot parcial de referência (módulo Ensino)
-- Fonte de verdade: schema live no Supabase (projeto flock-app-01).
-- Este arquivo NÃO é o dump completo do banco; espelha apenas teaching_*.
-- Atualizado: 2026-09-14 (DEV-111)

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
  attendance_eligible_from date,
  removed_at timestamptz,
  removed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name_snapshot text NOT NULL,
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
  ),
  CONSTRAINT teaching_enrollments_attendance_lifecycle_check CHECK (
    (
      (kind = 'possible_member'::text)
      AND (attendance_eligible_from IS NULL)
      AND (removed_at IS NULL)
    )
    OR (
      (kind = ANY (ARRAY['member'::text, 'guest'::text]))
      AND (attendance_eligible_from IS NOT NULL)
    )
  )
);

CREATE INDEX IF NOT EXISTS teaching_enrollments_class_id_idx
  ON public.teaching_enrollments (class_id);
CREATE INDEX IF NOT EXISTS teaching_enrollments_church_kind_idx
  ON public.teaching_enrollments (church_id, kind);
CREATE UNIQUE INDEX IF NOT EXISTS teaching_enrollments_class_member_active_uidx
  ON public.teaching_enrollments (class_id, member_id)
  WHERE ((member_id IS NOT NULL) AND (removed_at IS NULL));
CREATE INDEX IF NOT EXISTS idx_teaching_enrollments_class_lifecycle
  ON public.teaching_enrollments (
    church_id,
    class_id,
    removed_at,
    attendance_eligible_from
  );

-- ---------------------------------------------------------------------------
-- teaching_lesson_series
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teaching_lesson_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.teaching_classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_time time NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  recurrence_type text NOT NULL,
  weekdays smallint[],
  day_of_month smallint,
  interval_days smallint,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teaching_lesson_series_title_len CHECK (
    char_length(BTRIM(title)) BETWEEN 2 AND 150
  ),
  CONSTRAINT teaching_lesson_series_period_check CHECK (ends_on >= starts_on),
  CONSTRAINT teaching_lesson_series_rule_check CHECK (
    (
      recurrence_type = 'weekly'
      AND cardinality(weekdays) BETWEEN 1 AND 7
      AND weekdays <@ ARRAY[0,1,2,3,4,5,6]::smallint[]
      AND day_of_month IS NULL
      AND interval_days IS NULL
    )
    OR (
      recurrence_type = 'monthly'
      AND weekdays IS NULL
      AND day_of_month BETWEEN 1 AND 31
      AND interval_days IS NULL
    )
    OR (
      recurrence_type = 'interval_days'
      AND weekdays IS NULL
      AND day_of_month IS NULL
      AND interval_days BETWEEN 1 AND 366
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_teaching_lesson_series_church_class
  ON public.teaching_lesson_series (church_id, class_id);

-- ---------------------------------------------------------------------------
-- teaching_lessons
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teaching_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.teaching_classes(id) ON DELETE CASCADE,
  series_id uuid REFERENCES public.teaching_lesson_series(id) ON DELETE SET NULL,
  lesson_date date NOT NULL,
  start_time time NOT NULL,
  title text NOT NULL,
  description text,
  occurrence_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teaching_lessons_title_len CHECK (
    char_length(BTRIM(title)) BETWEEN 2 AND 150
  ),
  CONSTRAINT teaching_lessons_occurrence_key_check CHECK (
    (series_id IS NULL AND occurrence_key IS NULL)
    OR (series_id IS NOT NULL AND occurrence_key IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS teaching_lessons_series_occurrence_uidx
  ON public.teaching_lessons (series_id, occurrence_key)
  WHERE series_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS teaching_lessons_class_schedule_uidx
  ON public.teaching_lessons (class_id, lesson_date, start_time);
CREATE INDEX IF NOT EXISTS idx_teaching_lessons_church_class_date
  ON public.teaching_lessons (church_id, class_id, lesson_date, start_time, id);

-- ---------------------------------------------------------------------------
-- teaching_lesson_attendance
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teaching_lesson_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.teaching_lessons(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES public.teaching_enrollments(id) ON DELETE RESTRICT,
  status text NOT NULL,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teaching_lesson_attendance_status_check CHECK (
    status IN ('present', 'absent')
  ),
  CONSTRAINT teaching_lesson_attendance_lesson_enrollment_key UNIQUE (
    lesson_id,
    enrollment_id
  )
);

CREATE INDEX IF NOT EXISTS idx_teaching_lesson_attendance_church_lesson
  ON public.teaching_lesson_attendance (church_id, lesson_id, status);
CREATE INDEX IF NOT EXISTS idx_teaching_lesson_attendance_enrollment
  ON public.teaching_lesson_attendance (enrollment_id);

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
