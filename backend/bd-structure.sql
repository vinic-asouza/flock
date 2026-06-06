-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.
-- Last synced with flock-app-01 (Supabase): 2026-06-05
-- Missing objects vs previous version: enums, church_users, triggers, functions, views,
--   idx_churches_subscription_end_date, idx_pending_subscriptions_stripe_customer_id_unique,
--   CHECK churches_subscription_requires_customer, church_subscription_events (Ciclo 2)

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE public.church_user_role AS ENUM ('owner', 'admin', 'editor', 'reader');
CREATE TYPE public.church_user_status AS ENUM ('active', 'invited', 'disabled');
CREATE TYPE public.gender_enum AS ENUM ('masculino', 'feminino');
CREATE TYPE public.marital_status_enum AS ENUM ('solteiro', 'casado', 'divorciado', 'viuvo', 'outro');
CREATE TYPE public.admission_type_enum AS ENUM ('batismo', 'transferencia', 'profissao de fe', 'outro');
CREATE TYPE public.integration_status_enum AS ENUM ('em_progresso', 'integrado', 'descartado');

CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  church_id uuid NOT NULL,
  entity text NOT NULL CHECK (entity = ANY (ARRAY[
    'member'::text, 'role'::text, 'congregation'::text,
    'integration_member'::text, 'public_registration_link'::text,
    'public_integration_link'::text, 'group'::text, 'member_group'::text,
    'calendar_item'::text, 'account'::text, 'church'::text
  ])),
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action = ANY (ARRAY[
    'create'::text, 'update'::text, 'delete'::text,
    'convert'::text, 'import'::text, 'deactivate'::text
  ])),
  changes_before jsonb,
  changes_after jsonb,
  ip text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.calendar_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL,
  title text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['Programação'::text, 'Evento'::text, 'Encontro'::text, 'Reunião'::text])),
  description text,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone,
  is_recurring boolean DEFAULT false,
  recurrence_pattern text CHECK (recurrence_pattern = ANY (ARRAY['weekly'::text, 'monthly'::text, 'custom'::text])),
  recurrence_end_date timestamp with time zone,
  location text,
  congregation_id uuid,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'cancelled'::text, 'postponed'::text])),
  group_id uuid,
  responsible_member_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  recurrence_time time without time zone,
  recurrence_duration_minutes integer,
  recurrence_day_of_week integer CHECK (recurrence_day_of_week >= 0 AND recurrence_day_of_week <= 6),
  recurrence_day_of_month integer CHECK (recurrence_day_of_month >= 1 AND recurrence_day_of_month <= 31),
  recurrence_week_of_month integer CHECK (recurrence_week_of_month >= '-1'::integer AND recurrence_week_of_month <= 4),
  CONSTRAINT calendar_items_pkey PRIMARY KEY (id),
  CONSTRAINT calendar_items_church_id_fkey FOREIGN KEY (church_id) REFERENCES public.churches(id) ON DELETE CASCADE,
  CONSTRAINT calendar_items_congregation_id_fkey FOREIGN KEY (congregation_id) REFERENCES public.congregations(id) ON DELETE SET NULL,
  CONSTRAINT calendar_items_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE SET NULL,
  CONSTRAINT calendar_items_responsible_member_id_fkey FOREIGN KEY (responsible_member_id) REFERENCES public.members(id) ON DELETE SET NULL,
  CONSTRAINT calendar_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.calendar_participants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  calendar_item_id uuid NOT NULL,
  member_id uuid,
  guest_name character varying,
  guest_email character varying,
  guest_phone character varying,
  guest_whatsapp character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT calendar_participants_pkey PRIMARY KEY (id),
  CONSTRAINT calendar_participants_calendar_item_id_fkey FOREIGN KEY (calendar_item_id) REFERENCES public.calendar_items(id) ON DELETE CASCADE,
  CONSTRAINT calendar_participants_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE SET NULL
);
CREATE TABLE public.churches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  denomination text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  cnpj character varying NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  email_church character varying,
  phone_church character varying,
  stripe_customer_id character varying,
  stripe_subscription_id character varying,
  subscription_status character varying CHECK (subscription_status IS NULL OR (subscription_status::text = ANY (ARRAY['active'::character varying, 'canceled'::character varying, 'past_due'::character varying, 'unpaid'::character varying, 'incomplete'::character varying, 'incomplete_expired'::character varying, 'trialing'::character varying, 'paused'::character varying]::text[]))),
  plan_type character varying CHECK (plan_type IS NULL OR (plan_type::text = ANY (ARRAY['100'::character varying, '200'::character varying, '500'::character varying, '800'::character varying, 'custom'::character varying]::text[]))),
  subscription_start_date timestamp with time zone,
  subscription_end_date timestamp with time zone,
  subscription_updated_at timestamp with time zone DEFAULT now(),
  last_stripe_event_created bigint,
  CONSTRAINT churches_pkey PRIMARY KEY (id),
  CONSTRAINT churches_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT churches_subscription_requires_customer CHECK (stripe_subscription_id IS NULL OR stripe_customer_id IS NOT NULL)
);
CREATE TABLE public.congregations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  church_id uuid NOT NULL,
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  leader text,
  phone text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT congregations_pkey PRIMARY KEY (id),
  CONSTRAINT congregations_church_id_fkey FOREIGN KEY (church_id) REFERENCES public.churches(id) ON DELETE CASCADE
);
CREATE TABLE public.groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL,
  congregation_id uuid,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['Ministério'::character varying, 'Departamento'::character varying, 'Equipe'::character varying, 'Time'::character varying, 'Comissão'::character varying, 'Célula'::character varying, 'Grupo de Crescimento'::character varying, 'Pequeno Grupo'::character varying, 'Discipulado'::character varying, 'Classe'::character varying, 'Núcleo'::character varying, 'Região'::character varying, 'Grupo'::character varying]::text[])),
  name character varying NOT NULL,
  description text,
  responsible_id uuid,
  status boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT groups_pkey PRIMARY KEY (id),
  CONSTRAINT groups_church_id_fkey FOREIGN KEY (church_id) REFERENCES public.churches(id) ON DELETE CASCADE,
  CONSTRAINT groups_congregation_id_fkey FOREIGN KEY (congregation_id) REFERENCES public.congregations(id) ON DELETE SET NULL,
  CONSTRAINT groups_responsible_id_fkey FOREIGN KEY (responsible_id) REFERENCES public.members(id) ON DELETE SET NULL
);
CREATE TABLE public.integration_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL,
  name text NOT NULL,
  birth date,
  gender USER-DEFINED,
  marital_status USER-DEFINED,
  phone text,
  whatsapp text,
  expected_admission_type USER-DEFINED,
  expected_congregation_id uuid,
  mentor_id uuid,
  notes text,
  status USER-DEFINED NOT NULL DEFAULT 'em_progresso'::integration_status_enum,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT integration_members_pkey PRIMARY KEY (id),
  CONSTRAINT integration_members_church_id_fkey FOREIGN KEY (church_id) REFERENCES public.churches(id),
  CONSTRAINT integration_members_expected_congregation_id_fkey FOREIGN KEY (expected_congregation_id) REFERENCES public.congregations(id) ON DELETE SET NULL,
  CONSTRAINT integration_members_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.members(id)
);
CREATE TABLE public.member_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  group_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT member_groups_pkey PRIMARY KEY (id),
  CONSTRAINT member_groups_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE,
  CONSTRAINT member_groups_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE
);
CREATE TABLE public.members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL,
  name text NOT NULL,
  birth date NOT NULL,
  gender text CHECK (gender = ANY (ARRAY['Masculino'::text, 'Feminino'::text, 'Outro'::text])),
  marital_status text CHECK (marital_status = ANY (ARRAY['Solteiro'::text, 'Casado'::text, 'Divorciado'::text, 'Viúvo'::text, 'Outro'::text])),
  nationality text,
  document text,
  spouse text,
  address text,
  complement text,
  cep text,
  neighborhood text,
  city text,
  state text,
  phone text,
  whatsapp text,
  email text,
  baptism_date date,
  occupation text,
  admission text,
  admission_date date,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  congregation_id uuid,
  father_name text,
  mother_name text,
  children jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT members_pkey PRIMARY KEY (id),
  CONSTRAINT members_church_id_fkey FOREIGN KEY (church_id) REFERENCES public.churches(id),
  CONSTRAINT members_congregation_id_fkey FOREIGN KEY (congregation_id) REFERENCES public.congregations(id) ON DELETE SET NULL
);
CREATE TABLE public.pending_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email character varying NOT NULL,
  stripe_customer_id character varying NOT NULL,
  stripe_subscription_id character varying NOT NULL,
  plan_type character varying NOT NULL CHECK (plan_type::text = ANY (ARRAY['200'::character varying, '500'::character varying, '800'::character varying, 'custom'::character varying]::text[])),
  subscription_status character varying NOT NULL CHECK (subscription_status::text = ANY (ARRAY['active'::character varying, 'canceled'::character varying, 'past_due'::character varying, 'unpaid'::character varying, 'incomplete'::character varying, 'incomplete_expired'::character varying, 'trialing'::character varying, 'paused'::character varying]::text[])),
  subscription_start_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
  last_stripe_event_created bigint,
  link_token uuid,
  CONSTRAINT pending_subscriptions_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_subscriptions_link_token_unique ON pending_subscriptions (link_token) WHERE link_token IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_subscriptions_stripe_customer_id_unique ON pending_subscriptions (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_churches_stripe_customer_id_unique ON churches (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_churches_stripe_subscription_id_unique ON churches (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_churches_subscription_end_date ON churches (subscription_end_date) WHERE subscription_end_date IS NOT NULL;
CREATE TABLE public.processed_webhook_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  stripe_event_id character varying NOT NULL UNIQUE,
  event_type character varying NOT NULL,
  processed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  church_id uuid,
  processing_ms integer,
  outcome text DEFAULT 'processing'
    CHECK (outcome IN ('processing', 'success', 'released', 'failed')),
  CONSTRAINT processed_webhook_events_pkey PRIMARY KEY (id),
  CONSTRAINT processed_webhook_events_church_id_fkey FOREIGN KEY (church_id) REFERENCES public.churches(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_outcome ON public.processed_webhook_events(outcome);
CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_church_id ON public.processed_webhook_events(church_id) WHERE church_id IS NOT NULL;
CREATE TABLE public.public_integration_links (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  church_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  max_uses integer CHECK (max_uses IS NULL OR max_uses > 0),
  current_uses integer NOT NULL DEFAULT 0 CHECK (current_uses >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  CONSTRAINT public_integration_links_pkey PRIMARY KEY (id),
  CONSTRAINT public_integration_links_church_id_fkey FOREIGN KEY (church_id) REFERENCES public.churches(id),
  CONSTRAINT public_integration_links_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.public_registration_links (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  church_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  max_uses integer CHECK (max_uses IS NULL OR max_uses > 0),
  current_uses integer NOT NULL DEFAULT 0 CHECK (current_uses >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  default_congregation_id uuid,
  notes text,
  CONSTRAINT public_registration_links_pkey PRIMARY KEY (id),
  CONSTRAINT public_registration_links_church_id_fkey FOREIGN KEY (church_id) REFERENCES public.churches(id),
  CONSTRAINT public_registration_links_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT public_registration_links_default_congregation_id_fkey FOREIGN KEY (default_congregation_id) REFERENCES public.congregations(id) ON DELETE SET NULL
);
CREATE TABLE public.waitlist (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  phone character varying NOT NULL,
  church_name character varying NOT NULL,
  city character varying NOT NULL,
  state character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  plan character varying NOT NULL CHECK (plan::text = ANY (ARRAY['200'::character varying, '500'::character varying, '800'::character varying, 'personalizado'::character varying]::text[])),
  message text,
  CONSTRAINT waitlist_pkey PRIMARY KEY (id)
);

-- ============================================================
-- MULTI-USER: church_users
-- ============================================================
CREATE TABLE public.church_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL,
  user_id uuid NOT NULL UNIQUE,
  role public.church_user_role NOT NULL,
  status public.church_user_status NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT church_users_pkey PRIMARY KEY (id),
  CONSTRAINT uq_church_users_church_user UNIQUE (church_id, user_id),
  CONSTRAINT church_users_church_id_fkey FOREIGN KEY (church_id) REFERENCES public.churches(id) ON DELETE CASCADE,
  CONSTRAINT church_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS idx_church_users_church_id ON public.church_users(church_id);
CREATE INDEX IF NOT EXISTS idx_church_users_user_id ON public.church_users(user_id);
CREATE INDEX IF NOT EXISTS idx_church_users_status ON public.church_users(status);

-- ============================================================
-- BILLING HISTORY: church_subscription_events
-- ============================================================
CREATE TABLE public.church_subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid,  -- nullable para pending_checkout (landing sem igreja)
  event_type text NOT NULL,
  old_plan text,
  new_plan text,
  old_status text,
  new_status text,
  source text NOT NULL DEFAULT 'webhook',
  stripe_event_id text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT church_subscription_events_church_id_fkey FOREIGN KEY (church_id) REFERENCES public.churches(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_church_sub_events_church_id ON public.church_subscription_events(church_id);
CREATE INDEX IF NOT EXISTS idx_church_sub_events_created_at ON public.church_subscription_events(created_at DESC);

-- ============================================================
-- JOB RUNS: histórico de cron jobs (observabilidade OB09)
-- ============================================================
CREATE TABLE public.job_runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name      text NOT NULL,
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  rows_affected int DEFAULT 0,
  status        text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'failed')),
  error_message text,
  duration_ms   int
);
CREATE INDEX IF NOT EXISTS idx_job_runs_job_name_started ON public.job_runs(job_name, started_at DESC);

-- ============================================================
-- TRIGGER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_church_subscription_updated_at()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.plan_type IS DISTINCT FROM OLD.plan_type THEN
    NEW.subscription_updated_at = NOW();
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trigger_update_church_subscription_updated_at
  BEFORE UPDATE ON public.churches
  FOR EACH ROW EXECUTE FUNCTION update_church_subscription_updated_at();

CREATE OR REPLACE FUNCTION public.update_church_users_updated_at()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;$$;

CREATE TRIGGER trigger_update_church_users_updated_at
  BEFORE UPDATE ON public.church_users
  FOR EACH ROW EXECUTE FUNCTION update_church_users_updated_at();

-- ============================================================
-- RPC FUNCTIONS (Stripe)
-- ============================================================

-- Vínculo atômico pending → church (UPDATE + DELETE em uma transação)
CREATE OR REPLACE FUNCTION public.link_pending_to_church(
  p_pending_id uuid,
  p_church_id  uuid
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_pending public.pending_subscriptions%ROWTYPE;
  v_updated int;
BEGIN
  SELECT * INTO v_pending
  FROM public.pending_subscriptions
  WHERE id = p_pending_id AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'pending_not_found_or_expired');
  END IF;

  UPDATE public.churches SET
    stripe_customer_id        = v_pending.stripe_customer_id,
    stripe_subscription_id    = v_pending.stripe_subscription_id,
    subscription_status       = v_pending.subscription_status,
    plan_type                 = v_pending.plan_type,
    subscription_start_date   = v_pending.subscription_start_date,
    last_stripe_event_created = v_pending.last_stripe_event_created
  WHERE id = p_church_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'church_not_found');
  END IF;

  DELETE FROM public.pending_subscriptions WHERE id = p_pending_id;
  RETURN jsonb_build_object('ok', true);
END;$$;

-- Limpeza de eventos webhook com mais de 90 dias
CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_events()
  RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM processed_webhook_events WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;$$;

-- Validação de integridade de assinaturas
CREATE OR REPLACE FUNCTION public.validate_subscription_integrity()
  RETURNS TABLE(church_id uuid, issue_type text, description text)
  LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, 'canceled_not_free'::TEXT,
    'Assinatura cancelada e expirada mas plan_type não é 100'::TEXT
  FROM churches c
  WHERE c.subscription_status = 'canceled'
    AND c.subscription_end_date IS NOT NULL
    AND c.subscription_end_date <= NOW()
    AND c.plan_type != '100' AND c.plan_type IS NOT NULL

  UNION ALL

  SELECT c.id, 'active_free_plan'::TEXT,
    'Status ativo mas plan_type é 100 (deveria ter assinatura paga)'::TEXT
  FROM churches c
  WHERE c.subscription_status = 'active'
    AND c.plan_type = '100'
    AND c.stripe_subscription_id IS NOT NULL

  UNION ALL

  SELECT c.id, 'subscription_without_customer'::TEXT,
    'Tem subscription_id mas não tem customer_id'::TEXT
  FROM churches c
  WHERE c.stripe_subscription_id IS NOT NULL
    AND c.stripe_customer_id IS NULL;
END;$$;

-- Limpeza de pending_subscriptions expiradas
CREATE OR REPLACE FUNCTION public.cleanup_expired_pending_subscriptions()
  RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM pending_subscriptions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;$$;

-- RPCs sensíveis: somente service_role (DB19)
REVOKE ALL ON FUNCTION public.link_pending_to_church(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_pending_to_church(uuid, uuid) TO service_role;
REVOKE ALL ON FUNCTION public.cleanup_old_webhook_events() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_webhook_events() TO service_role;
REVOKE ALL ON FUNCTION public.validate_subscription_integrity() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_subscription_integrity() TO service_role;
REVOKE ALL ON FUNCTION public.cleanup_expired_pending_subscriptions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_pending_subscriptions() TO service_role;

-- ============================================================
-- ROW LEVEL SECURITY (DB18 + DB19 — deny_anon em todas as tabelas public)
-- ============================================================

ALTER TABLE public.churches                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_webhook_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_runs                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_participants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.congregations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_groups              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_integration_links   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_registration_links  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist                   ENABLE ROW LEVEL SECURITY;

CREATE POLICY deny_anon_churches               ON public.churches                   AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY deny_anon_pending                ON public.pending_subscriptions      AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY deny_anon_webhook_events         ON public.processed_webhook_events   AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY deny_anon_sub_events             ON public.church_subscription_events AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY deny_anon_job_runs               ON public.job_runs                   AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY deny_anon_audit_logs             ON public.audit_logs                 AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY deny_anon_calendar_items         ON public.calendar_items             AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY deny_anon_calendar_participants  ON public.calendar_participants      AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY deny_anon_church_users           ON public.church_users               AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY deny_anon_congregations          ON public.congregations              AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY deny_anon_groups                 ON public.groups                     AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY deny_anon_integration_members    ON public.integration_members        AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY deny_anon_member_groups          ON public.member_groups              AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY deny_anon_members                ON public.members                    AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY deny_anon_public_integration_links ON public.public_integration_links AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY deny_anon_public_registration_links ON public.public_registration_links AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY deny_anon_waitlist               ON public.waitlist                   AS RESTRICTIVE FOR ALL TO anon USING (false);

-- ============================================================
-- VIEWS (Stripe monitoring)
-- ============================================================
CREATE OR REPLACE VIEW public.vw_subscription_status AS
  SELECT id AS church_id, name AS church_name, plan_type, subscription_status,
    stripe_customer_id, stripe_subscription_id,
    subscription_start_date, subscription_end_date,
    CASE
      WHEN subscription_status = 'canceled' AND subscription_end_date IS NOT NULL AND subscription_end_date > now()
        THEN 'Cancelada (Ativa até término)'
      WHEN subscription_status = 'canceled' AND (subscription_end_date IS NULL OR subscription_end_date <= now())
        THEN 'Cancelada (Expirada)'
      WHEN subscription_status = 'active' THEN 'Ativa'
      WHEN subscription_status = 'past_due' THEN 'Pagamento Atrasado'
      WHEN subscription_status = 'trialing' THEN 'Período de Teste'
      ELSE subscription_status
    END AS status_display,
    CASE
      WHEN subscription_status = 'canceled' AND (subscription_end_date IS NULL OR subscription_end_date <= now()) AND plan_type <> '100'
        THEN '⚠️ Deveria ser plano 100'
      WHEN subscription_status = 'active' AND plan_type = '100'
        THEN '⚠️ Plano gratuito com status ativo'
      ELSE 'OK'
    END AS validation_status
  FROM churches c WHERE stripe_customer_id IS NOT NULL;

CREATE OR REPLACE VIEW public.vw_webhook_stats AS
  SELECT event_type,
    count(*) AS total_processed,
    count(DISTINCT stripe_event_id) AS unique_events,
    min(processed_at) AS first_processed,
    max(processed_at) AS last_processed,
    count(*) FILTER (WHERE processed_at > now() - INTERVAL '24 hours') AS last_24h,
    count(*) FILTER (WHERE processed_at > now() - INTERVAL '7 days') AS last_7d
  FROM processed_webhook_events
  GROUP BY event_type ORDER BY count(*) DESC;