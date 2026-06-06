-- DB20: Alinhar constraints de audit_logs com auditLogger.ts
-- Projeto: flock-app-01 (lzsybtvywrhwsxtsywbw)

-- Actions: create, update, delete + convert, import, deactivate
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check
CHECK (action = ANY (ARRAY[
  'create'::text, 'update'::text, 'delete'::text,
  'convert'::text, 'import'::text, 'deactivate'::text
]));

-- Entities: inclui member_group (faltava no script anterior)
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_entity_check;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_entity_check
CHECK (entity = ANY (ARRAY[
  'member'::text, 'role'::text, 'congregation'::text,
  'integration_member'::text, 'public_registration_link'::text,
  'public_integration_link'::text, 'group'::text, 'member_group'::text,
  'calendar_item'::text, 'account'::text, 'church'::text
]));

COMMENT ON CONSTRAINT audit_logs_action_check ON public.audit_logs IS
  'Ações suportadas pelo sistema de auditoria';
COMMENT ON CONSTRAINT audit_logs_entity_check ON public.audit_logs IS
  'Entidades suportadas pelo sistema de auditoria';
