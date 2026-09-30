-- DEV-130: fecha leitura anon nas teaching_* ainda abertas e nas views
-- SECURITY DEFINER do schema public.
-- Padrão DEV-111: RLS ligado, sem policy permissiva, grant só para service_role.
-- O app (Painel, link público, billing stats) usa supabaseAdmin.

ALTER TABLE public.teaching_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_class_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_public_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_materials ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.teaching_programs FROM anon, authenticated;
REVOKE ALL ON public.teaching_classes FROM anon, authenticated;
REVOKE ALL ON public.teaching_class_teachers FROM anon, authenticated;
REVOKE ALL ON public.teaching_enrollments FROM anon, authenticated;
REVOKE ALL ON public.teaching_public_links FROM anon, authenticated;
REVOKE ALL ON public.teaching_materials FROM anon, authenticated;

GRANT ALL ON public.teaching_programs TO service_role;
GRANT ALL ON public.teaching_classes TO service_role;
GRANT ALL ON public.teaching_class_teachers TO service_role;
GRANT ALL ON public.teaching_enrollments TO service_role;
GRANT ALL ON public.teaching_public_links TO service_role;
GRANT ALL ON public.teaching_materials TO service_role;

ALTER VIEW public.vw_subscription_status SET (security_invoker = true);
ALTER VIEW public.vw_webhook_stats SET (security_invoker = true);

REVOKE ALL ON public.vw_subscription_status FROM anon, authenticated;
REVOKE ALL ON public.vw_webhook_stats FROM anon, authenticated;

GRANT SELECT ON public.vw_subscription_status TO service_role;
GRANT SELECT ON public.vw_webhook_stats TO service_role;
