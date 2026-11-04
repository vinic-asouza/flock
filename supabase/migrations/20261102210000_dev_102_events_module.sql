-- DEV-102: módulo Eventos (encontros especiais + inscrição + link público)
-- App usa supabaseAdmin (service_role). RLS ligado sem policy permissiva (padrão DEV-130).

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  location text,
  congregation_id uuid REFERENCES public.congregations(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft',
  capacity integer,
  responsible_id uuid NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT events_name_len CHECK (
    (char_length(TRIM(BOTH FROM name)) >= 2) AND (char_length(name) <= 100)
  ),
  CONSTRAINT events_status_check CHECK (
    status = ANY (ARRAY['draft'::text, 'open'::text, 'in_progress'::text, 'closed'::text, 'archived'::text])
  ),
  CONSTRAINT events_ends_at_check CHECK (
    (ends_at IS NULL) OR (ends_at >= starts_at)
  ),
  CONSTRAINT events_capacity_check CHECK (
    (capacity IS NULL) OR (capacity > 0)
  )
);

CREATE INDEX IF NOT EXISTS events_church_id_idx
  ON public.events (church_id);
CREATE INDEX IF NOT EXISTS events_church_starts_at_idx
  ON public.events (church_id, starts_at);
CREATE INDEX IF NOT EXISTS events_church_congregation_id_idx
  ON public.events (church_id, congregation_id);
CREATE INDEX IF NOT EXISTS events_church_status_idx
  ON public.events (church_id, status);
CREATE INDEX IF NOT EXISTS events_group_id_idx
  ON public.events (group_id);

-- ---------------------------------------------------------------------------
-- event_organizers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_organizers (
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, member_id)
);

CREATE INDEX IF NOT EXISTS event_organizers_member_id_idx
  ON public.event_organizers (member_id);

-- ---------------------------------------------------------------------------
-- event_registrations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  kind text NOT NULL,
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  full_name text,
  whatsapp text,
  birth_date date,
  email text,
  match_meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_registrations_kind_check CHECK (
    kind = ANY (ARRAY['member'::text, 'guest'::text, 'possible_member'::text])
  ),
  CONSTRAINT event_registrations_member_kind_check CHECK (
    ((kind = 'member'::text) AND (member_id IS NOT NULL))
    OR (
      (kind = ANY (ARRAY['guest'::text, 'possible_member'::text]))
      AND (full_name IS NOT NULL)
      AND (whatsapp IS NOT NULL)
      AND (birth_date IS NOT NULL)
    )
  )
);

CREATE INDEX IF NOT EXISTS event_registrations_event_id_idx
  ON public.event_registrations (event_id);
CREATE INDEX IF NOT EXISTS event_registrations_church_kind_idx
  ON public.event_registrations (church_id, kind);
CREATE UNIQUE INDEX IF NOT EXISTS event_registrations_event_member_uidx
  ON public.event_registrations (event_id, member_id)
  WHERE (member_id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- event_public_links
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_public_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  token text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  max_uses integer,
  current_uses integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_public_links_token_unique UNIQUE (token),
  CONSTRAINT event_public_links_max_uses_check CHECK (
    (max_uses IS NULL) OR (max_uses > 0)
  ),
  CONSTRAINT event_public_links_current_uses_check CHECK (current_uses >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS event_public_links_event_id_uidx
  ON public.event_public_links (event_id);
CREATE INDEX IF NOT EXISTS event_public_links_church_id_idx
  ON public.event_public_links (church_id);

-- ---------------------------------------------------------------------------
-- RLS + grants (service_role only)
-- ---------------------------------------------------------------------------
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_public_links ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.events FROM anon, authenticated;
REVOKE ALL ON public.event_organizers FROM anon, authenticated;
REVOKE ALL ON public.event_registrations FROM anon, authenticated;
REVOKE ALL ON public.event_public_links FROM anon, authenticated;

GRANT ALL ON public.events TO service_role;
GRANT ALL ON public.event_organizers TO service_role;
GRANT ALL ON public.event_registrations TO service_role;
GRANT ALL ON public.event_public_links TO service_role;
