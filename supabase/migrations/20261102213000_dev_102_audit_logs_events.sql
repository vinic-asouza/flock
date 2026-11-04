-- DEV-102: allow audit_logs.entity for Events module entities
-- Controllers call logAudit with event / event_organizers / event_registration / event_public_link.

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_attribute attribute
    ON attribute.attrelid = c.conrelid
    AND attribute.attnum = ANY (c.conkey)
  WHERE c.conrelid = 'public.audit_logs'::regclass
    AND c.contype = 'c'
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
      'teaching_lesson_series', 'teaching_lesson_attendance', 'teaching_material',
      'event', 'event_organizers', 'event_registration', 'event_public_link'
    )
  );
