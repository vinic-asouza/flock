-- DEV-111: materialized teaching lessons, editable series and attendance.

ALTER TABLE public.teaching_enrollments
  ADD COLUMN IF NOT EXISTS attendance_eligible_from date,
  ADD COLUMN IF NOT EXISTS removed_at timestamptz,
  ADD COLUMN IF NOT EXISTS removed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS display_name_snapshot text;

UPDATE public.teaching_enrollments enrollment
SET display_name_snapshot = COALESCE(
  NULLIF(BTRIM(enrollment.full_name), ''),
  (SELECT member.name FROM public.members member WHERE member.id = enrollment.member_id),
  'Matrícula histórica'
)
WHERE enrollment.display_name_snapshot IS NULL;

UPDATE public.teaching_enrollments enrollment
SET attendance_eligible_from = enrollment.created_at::date
WHERE enrollment.kind <> 'possible_member'
  AND enrollment.attendance_eligible_from IS NULL;

ALTER TABLE public.teaching_enrollments
  ALTER COLUMN display_name_snapshot SET NOT NULL;

ALTER TABLE public.teaching_enrollments
  DROP CONSTRAINT IF EXISTS teaching_enrollments_attendance_lifecycle_check;
ALTER TABLE public.teaching_enrollments
  ADD CONSTRAINT teaching_enrollments_attendance_lifecycle_check CHECK (
    (kind = 'possible_member' AND attendance_eligible_from IS NULL AND removed_at IS NULL)
    OR (kind IN ('member', 'guest') AND attendance_eligible_from IS NOT NULL)
  );

DROP INDEX IF EXISTS public.teaching_enrollments_class_member_uidx;
CREATE UNIQUE INDEX teaching_enrollments_class_member_active_uidx
  ON public.teaching_enrollments (class_id, member_id)
  WHERE member_id IS NOT NULL AND removed_at IS NULL;
CREATE INDEX idx_teaching_enrollments_class_lifecycle
  ON public.teaching_enrollments (church_id, class_id, removed_at, attendance_eligible_from);

CREATE TABLE public.teaching_lesson_series (
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

CREATE INDEX idx_teaching_lesson_series_church_class
  ON public.teaching_lesson_series (church_id, class_id);

CREATE TABLE public.teaching_lessons (
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

CREATE UNIQUE INDEX teaching_lessons_series_occurrence_uidx
  ON public.teaching_lessons (series_id, occurrence_key)
  WHERE series_id IS NOT NULL;
CREATE UNIQUE INDEX teaching_lessons_class_schedule_uidx
  ON public.teaching_lessons (class_id, lesson_date, start_time);
CREATE INDEX idx_teaching_lessons_church_class_date
  ON public.teaching_lessons (church_id, class_id, lesson_date, start_time, id);

CREATE TABLE public.teaching_lesson_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.teaching_lessons(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES public.teaching_enrollments(id) ON DELETE RESTRICT,
  status text NOT NULL,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teaching_lesson_attendance_status_check CHECK (status IN ('present', 'absent')),
  CONSTRAINT teaching_lesson_attendance_lesson_enrollment_key UNIQUE (lesson_id, enrollment_id)
);

CREATE INDEX idx_teaching_lesson_attendance_church_lesson
  ON public.teaching_lesson_attendance (church_id, lesson_id, status);
CREATE INDEX idx_teaching_lesson_attendance_enrollment
  ON public.teaching_lesson_attendance (enrollment_id);

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT constraint.conname INTO constraint_name
  FROM pg_constraint constraint
  JOIN pg_attribute attribute
    ON attribute.attrelid = constraint.conrelid
    AND attribute.attnum = ANY (constraint.conkey)
  WHERE constraint.conrelid = 'public.audit_logs'::regclass
    AND constraint.contype = 'c'
    AND attribute.attname = 'entity'
  LIMIT 1;
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.audit_logs DROP CONSTRAINT %I', constraint_name);
  END IF;
END;
$$;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_entity_check CHECK (
    entity IN (
      'member', 'role', 'congregation', 'integration_member', 'public_registration_link',
      'public_integration_link', 'group', 'member_group', 'calendar_item', 'account',
      'church', 'teaching_program', 'teaching_class', 'teaching_class_teachers',
      'teaching_enrollment', 'teaching_public_link', 'teaching_lesson',
      'teaching_lesson_series', 'teaching_lesson_attendance'
    )
  );

ALTER TABLE public.teaching_lesson_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_lesson_attendance ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.teaching_lesson_series FROM anon, authenticated;
REVOKE ALL ON public.teaching_lessons FROM anon, authenticated;
REVOKE ALL ON public.teaching_lesson_attendance FROM anon, authenticated;
GRANT ALL ON public.teaching_lesson_series TO service_role;
GRANT ALL ON public.teaching_lessons TO service_role;
GRANT ALL ON public.teaching_lesson_attendance TO service_role;

CREATE OR REPLACE FUNCTION public.create_teaching_lesson_series(
  p_church_id uuid,
  p_class_id uuid,
  p_actor_id uuid,
  p_title text,
  p_description text,
  p_start_time time,
  p_starts_on date,
  p_ends_on date,
  p_recurrence_type text,
  p_weekdays smallint[],
  p_day_of_month smallint,
  p_interval_days smallint,
  p_occurrences jsonb
) RETURNS public.teaching_lesson_series
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  created_series public.teaching_lesson_series;
BEGIN
  IF jsonb_typeof(p_occurrences) <> 'array'
     OR jsonb_array_length(p_occurrences) NOT BETWEEN 1 AND 366 THEN
    RAISE EXCEPTION 'invalid_occurrence_count' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.teaching_classes
    WHERE id = p_class_id AND church_id = p_church_id
  ) THEN
    RAISE EXCEPTION 'class_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.teaching_lesson_series (
    church_id, class_id, title, description, start_time, starts_on, ends_on,
    recurrence_type, weekdays, day_of_month, interval_days, created_by
  ) VALUES (
    p_church_id, p_class_id, BTRIM(p_title), NULLIF(p_description, ''), p_start_time,
    p_starts_on, p_ends_on, p_recurrence_type, p_weekdays, p_day_of_month,
    p_interval_days, p_actor_id
  ) RETURNING * INTO created_series;

  INSERT INTO public.teaching_lessons (
    church_id, class_id, series_id, lesson_date, start_time, title, description, occurrence_key
  )
  SELECT
    p_church_id, p_class_id, created_series.id, occurrence.value::date, p_start_time,
    BTRIM(p_title), NULLIF(p_description, ''), occurrence.value
  FROM jsonb_array_elements_text(p_occurrences) occurrence(value);

  RETURN created_series;
END;
$$;

CREATE OR REPLACE FUNCTION public.replace_teaching_lesson_series_following(
  p_church_id uuid,
  p_lesson_id uuid,
  p_actor_id uuid,
  p_title text,
  p_description text,
  p_start_time time,
  p_starts_on date,
  p_ends_on date,
  p_recurrence_type text,
  p_weekdays smallint[],
  p_day_of_month smallint,
  p_interval_days smallint,
  p_occurrences jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  pivot public.teaching_lessons;
  old_series public.teaching_lesson_series;
  new_series_id uuid;
BEGIN
  IF jsonb_typeof(p_occurrences) <> 'array'
     OR jsonb_array_length(p_occurrences) NOT BETWEEN 1 AND 366 THEN
    RAISE EXCEPTION 'invalid_occurrence_count' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO pivot FROM public.teaching_lessons
  WHERE id = p_lesson_id AND church_id = p_church_id FOR UPDATE;
  IF pivot.id IS NULL THEN RAISE EXCEPTION 'lesson_not_found' USING ERRCODE = 'P0002'; END IF;
  IF pivot.series_id IS NULL THEN
    RAISE EXCEPTION 'lesson_is_not_recurring' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO old_series FROM public.teaching_lesson_series
  WHERE id = pivot.series_id AND church_id = p_church_id FOR UPDATE;

  IF EXISTS (
    SELECT 1
    FROM public.teaching_lesson_attendance attendance
    JOIN public.teaching_lessons lesson ON lesson.id = attendance.lesson_id
    WHERE lesson.series_id = old_series.id
      AND lesson.occurrence_key >= pivot.occurrence_key
      AND NOT (p_occurrences ? lesson.occurrence_key)
  ) THEN
    RAISE EXCEPTION 'attendance_reassociation_required' USING ERRCODE = 'P0001';
  END IF;

  IF pivot.occurrence_key::date > old_series.starts_on THEN
    UPDATE public.teaching_lesson_series
    SET ends_on = (pivot.occurrence_key::date - 1), updated_at = now()
    WHERE id = old_series.id;
  END IF;

  INSERT INTO public.teaching_lesson_series (
    church_id, class_id, title, description, start_time, starts_on, ends_on,
    recurrence_type, weekdays, day_of_month, interval_days, created_by
  ) VALUES (
    p_church_id, pivot.class_id, BTRIM(p_title), NULLIF(p_description, ''), p_start_time,
    p_starts_on, p_ends_on, p_recurrence_type, p_weekdays, p_day_of_month,
    p_interval_days, p_actor_id
  ) RETURNING id INTO new_series_id;

  DELETE FROM public.teaching_lessons lesson
  WHERE lesson.series_id = old_series.id
    AND lesson.occurrence_key >= pivot.occurrence_key
    AND NOT (p_occurrences ? lesson.occurrence_key);

  UPDATE public.teaching_lessons lesson
  SET series_id = new_series_id,
      lesson_date = lesson.occurrence_key::date,
      start_time = p_start_time,
      title = BTRIM(p_title),
      description = NULLIF(p_description, ''),
      updated_at = now()
  WHERE lesson.series_id = old_series.id
    AND lesson.occurrence_key >= pivot.occurrence_key
    AND p_occurrences ? lesson.occurrence_key;

  INSERT INTO public.teaching_lessons (
    church_id, class_id, series_id, lesson_date, start_time, title, description, occurrence_key
  )
  SELECT
    p_church_id, pivot.class_id, new_series_id, occurrence.value::date, p_start_time,
    BTRIM(p_title), NULLIF(p_description, ''), occurrence.value
  FROM jsonb_array_elements_text(p_occurrences) occurrence(value)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.teaching_lessons
    WHERE series_id = new_series_id AND occurrence_key = occurrence.value
  );

  IF pivot.occurrence_key::date <= old_series.starts_on THEN
    DELETE FROM public.teaching_lesson_series WHERE id = old_series.id;
  END IF;

  RETURN new_series_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_teaching_lessons_scope(
  p_church_id uuid,
  p_lesson_id uuid,
  p_scope text,
  p_confirm_attendance_deletion boolean
) RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  pivot public.teaching_lessons;
  affected_count integer;
BEGIN
  SELECT * INTO pivot FROM public.teaching_lessons
  WHERE id = p_lesson_id AND church_id = p_church_id FOR UPDATE;
  IF pivot.id IS NULL THEN RAISE EXCEPTION 'lesson_not_found' USING ERRCODE = 'P0002'; END IF;
  IF p_scope NOT IN ('single', 'following') THEN
    RAISE EXCEPTION 'invalid_scope' USING ERRCODE = '22023';
  END IF;
  IF p_scope = 'following' AND pivot.series_id IS NULL THEN
    RAISE EXCEPTION 'lesson_is_not_recurring' USING ERRCODE = '22023';
  END IF;

  IF NOT p_confirm_attendance_deletion AND EXISTS (
    SELECT 1
    FROM public.teaching_lesson_attendance attendance
    JOIN public.teaching_lessons lesson ON lesson.id = attendance.lesson_id
    WHERE lesson.church_id = p_church_id
      AND (
        lesson.id = pivot.id
        OR (
          p_scope = 'following'
          AND lesson.series_id = pivot.series_id
          AND lesson.occurrence_key >= pivot.occurrence_key
        )
      )
  ) THEN
    RAISE EXCEPTION 'attendance_deletion_confirmation_required' USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM public.teaching_lessons lesson
  WHERE lesson.church_id = p_church_id
    AND (
      lesson.id = pivot.id
      OR (
        p_scope = 'following'
        AND lesson.series_id = pivot.series_id
        AND lesson.occurrence_key >= pivot.occurrence_key
      )
    );
  GET DIAGNOSTICS affected_count = ROW_COUNT;

  IF p_scope = 'following' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.teaching_lessons WHERE series_id = pivot.series_id
    ) THEN
      DELETE FROM public.teaching_lesson_series WHERE id = pivot.series_id;
    ELSE
      UPDATE public.teaching_lesson_series
      SET ends_on = (pivot.occurrence_key::date - 1), updated_at = now()
      WHERE id = pivot.series_id;
    END IF;
  END IF;
  RETURN affected_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_teaching_lesson_attendance(
  p_church_id uuid,
  p_lesson_id uuid,
  p_actor_id uuid,
  p_changes jsonb,
  p_mark_unregistered_present boolean,
  p_overwrite_absent boolean
) RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  lesson public.teaching_lessons;
  changed_count integer := 0;
  operation_count integer;
BEGIN
  SELECT * INTO lesson FROM public.teaching_lessons
  WHERE id = p_lesson_id AND church_id = p_church_id FOR UPDATE;
  IF lesson.id IS NULL THEN RAISE EXCEPTION 'lesson_not_found' USING ERRCODE = 'P0002'; END IF;
  IF jsonb_typeof(COALESCE(p_changes, '[]'::jsonb)) <> 'array'
     OR jsonb_array_length(COALESCE(p_changes, '[]'::jsonb)) > 500 THEN
    RAISE EXCEPTION 'invalid_attendance_batch' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(COALESCE(p_changes, '[]'::jsonb))
      AS change(enrollment_id uuid, status text)
    LEFT JOIN public.teaching_enrollments enrollment
      ON enrollment.id = change.enrollment_id
      AND enrollment.church_id = p_church_id
      AND enrollment.class_id = lesson.class_id
    WHERE enrollment.id IS NULL
      OR enrollment.kind = 'possible_member'
      OR enrollment.attendance_eligible_from > lesson.lesson_date
      OR (enrollment.removed_at IS NOT NULL AND enrollment.removed_at::date <= lesson.lesson_date)
      OR (change.status IS NOT NULL AND change.status NOT IN ('present', 'absent'))
  ) THEN
    RAISE EXCEPTION 'ineligible_attendance_enrollment' USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM public.teaching_lesson_attendance attendance
  USING jsonb_to_recordset(COALESCE(p_changes, '[]'::jsonb))
    AS change(enrollment_id uuid, status text)
  WHERE attendance.church_id = p_church_id
    AND attendance.lesson_id = p_lesson_id
    AND attendance.enrollment_id = change.enrollment_id
    AND change.status IS NULL;
  GET DIAGNOSTICS operation_count = ROW_COUNT;
  changed_count := changed_count + operation_count;

  INSERT INTO public.teaching_lesson_attendance (
    church_id, lesson_id, enrollment_id, status, recorded_by
  )
  SELECT p_church_id, p_lesson_id, change.enrollment_id, change.status, p_actor_id
  FROM jsonb_to_recordset(COALESCE(p_changes, '[]'::jsonb))
    AS change(enrollment_id uuid, status text)
  WHERE change.status IS NOT NULL
  ON CONFLICT (lesson_id, enrollment_id) DO UPDATE
    SET status = EXCLUDED.status, recorded_by = EXCLUDED.recorded_by, updated_at = now();
  GET DIAGNOSTICS operation_count = ROW_COUNT;
  changed_count := changed_count + operation_count;

  IF p_mark_unregistered_present THEN
    INSERT INTO public.teaching_lesson_attendance (
      church_id, lesson_id, enrollment_id, status, recorded_by
    )
    SELECT p_church_id, p_lesson_id, enrollment.id, 'present', p_actor_id
    FROM public.teaching_enrollments enrollment
    WHERE enrollment.church_id = p_church_id
      AND enrollment.class_id = lesson.class_id
      AND enrollment.kind IN ('member', 'guest')
      AND enrollment.attendance_eligible_from <= lesson.lesson_date
      AND (enrollment.removed_at IS NULL OR enrollment.removed_at::date > lesson.lesson_date)
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_to_recordset(COALESCE(p_changes, '[]'::jsonb))
          AS explicit_change(enrollment_id uuid, status text)
        WHERE explicit_change.enrollment_id = enrollment.id
      )
    ON CONFLICT (lesson_id, enrollment_id) DO UPDATE
      SET status = CASE
        WHEN p_overwrite_absent THEN 'present'
        ELSE teaching_lesson_attendance.status
      END,
      recorded_by = CASE
        WHEN p_overwrite_absent THEN EXCLUDED.recorded_by
        ELSE teaching_lesson_attendance.recorded_by
      END,
      updated_at = CASE
        WHEN p_overwrite_absent THEN now()
        ELSE teaching_lesson_attendance.updated_at
      END;
    GET DIAGNOSTICS operation_count = ROW_COUNT;
    changed_count := changed_count + operation_count;
  END IF;

  RETURN changed_count;
END;
$$;

REVOKE ALL ON FUNCTION public.create_teaching_lesson_series(
  uuid, uuid, uuid, text, text, time, date, date, text, smallint[], smallint, smallint, jsonb
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.replace_teaching_lesson_series_following(
  uuid, uuid, uuid, text, text, time, date, date, text, smallint[], smallint, smallint, jsonb
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_teaching_lessons_scope(
  uuid, uuid, text, boolean
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_teaching_lesson_attendance(
  uuid, uuid, uuid, jsonb, boolean, boolean
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_teaching_lesson_series(
  uuid, uuid, uuid, text, text, time, date, date, text, smallint[], smallint, smallint, jsonb
) TO service_role;
GRANT EXECUTE ON FUNCTION public.replace_teaching_lesson_series_following(
  uuid, uuid, uuid, text, text, time, date, date, text, smallint[], smallint, smallint, jsonb
) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_teaching_lessons_scope(
  uuid, uuid, text, boolean
) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_teaching_lesson_attendance(
  uuid, uuid, uuid, jsonb, boolean, boolean
) TO service_role;
