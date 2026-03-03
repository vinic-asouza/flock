-- Migração: popular church_users com os owners atuais (churches.user_id)
-- Execute este script no Supabase SQL Editor APÓS executar create_church_users_table.sql
-- Garante que cada igreja tenha exatamente um registro owner em church_users.

-- Inserir um registro owner para cada igreja (user_id = churches.user_id)
INSERT INTO public.church_users (church_id, user_id, role, status)
SELECT id AS church_id, user_id, 'owner'::church_user_role, 'active'::church_user_status
FROM public.churches
ON CONFLICT (church_id, user_id) DO NOTHING;

-- Verificar: contar igrejas vs registros owner em church_users
-- (opcional, para conferência após rodar)
-- SELECT (SELECT COUNT(*) FROM churches) AS total_churches,
--        (SELECT COUNT(*) FROM church_users WHERE role = 'owner') AS total_owners;
