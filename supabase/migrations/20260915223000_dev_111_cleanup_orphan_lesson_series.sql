-- DEV-111 follow-up: drop orphan series when the last single occurrence is deleted.

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

  IF pivot.series_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.teaching_lessons WHERE series_id = pivot.series_id
    ) THEN
      DELETE FROM public.teaching_lesson_series WHERE id = pivot.series_id;
    ELSIF p_scope = 'following' THEN
      UPDATE public.teaching_lesson_series
      SET ends_on = (pivot.occurrence_key::date - 1), updated_at = now()
      WHERE id = pivot.series_id;
    END IF;
  END IF;

  RETURN affected_count;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_teaching_lessons_scope(
  uuid, uuid, text, boolean
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_teaching_lessons_scope(
  uuid, uuid, text, boolean
) TO service_role;
