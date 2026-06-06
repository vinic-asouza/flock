-- DB19: RLS global — deny_anon nas 12 tabelas restantes + cleanup políticas legadas + hardening RPCs
-- Projeto: flock-app-01 (lzsybtvywrhwsxtsywbw)
-- Padrão: DB18 (ENABLE ROW LEVEL SECURITY + deny_anon RESTRICTIVE TO anon USING (false))

-- ============================================================
-- Fase 2: Remover políticas legadas owner-only (incompatíveis com church_users)
-- ============================================================

DROP POLICY IF EXISTS "Allow access to own church data" ON public.churches;
DROP POLICY IF EXISTS "Igrejas podem gerenciar suas próprias congregações" ON public.congregations;
DROP POLICY IF EXISTS "Allow access to own members data" ON public.members;
DROP POLICY IF EXISTS audit_logs_insert_own_church ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_select_own_church ON public.audit_logs;

-- ============================================================
-- Fase 3: Habilitar RLS + deny_anon nas 12 tabelas sem proteção
-- ============================================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_anon_audit_logs ON public.audit_logs AS RESTRICTIVE FOR ALL TO anon USING (false);

ALTER TABLE public.calendar_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_anon_calendar_items ON public.calendar_items AS RESTRICTIVE FOR ALL TO anon USING (false);

ALTER TABLE public.calendar_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_anon_calendar_participants ON public.calendar_participants AS RESTRICTIVE FOR ALL TO anon USING (false);

ALTER TABLE public.church_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_anon_church_users ON public.church_users AS RESTRICTIVE FOR ALL TO anon USING (false);

ALTER TABLE public.congregations ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_anon_congregations ON public.congregations AS RESTRICTIVE FOR ALL TO anon USING (false);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_anon_groups ON public.groups AS RESTRICTIVE FOR ALL TO anon USING (false);

ALTER TABLE public.integration_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_anon_integration_members ON public.integration_members AS RESTRICTIVE FOR ALL TO anon USING (false);

ALTER TABLE public.member_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_anon_member_groups ON public.member_groups AS RESTRICTIVE FOR ALL TO anon USING (false);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_anon_members ON public.members AS RESTRICTIVE FOR ALL TO anon USING (false);

ALTER TABLE public.public_integration_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_anon_public_integration_links ON public.public_integration_links AS RESTRICTIVE FOR ALL TO anon USING (false);

ALTER TABLE public.public_registration_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_anon_public_registration_links ON public.public_registration_links AS RESTRICTIVE FOR ALL TO anon USING (false);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_anon_waitlist ON public.waitlist AS RESTRICTIVE FOR ALL TO anon USING (false);

-- ============================================================
-- Fase 4: Endurecer RPCs sensíveis — somente service_role
-- ============================================================

REVOKE ALL ON FUNCTION public.link_pending_to_church(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_pending_to_church(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.cleanup_old_webhook_events() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_webhook_events() TO service_role;

REVOKE ALL ON FUNCTION public.validate_subscription_integrity() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_subscription_integrity() TO service_role;

REVOKE ALL ON FUNCTION public.cleanup_expired_pending_subscriptions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_pending_subscriptions() TO service_role;
