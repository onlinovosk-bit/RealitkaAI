-- >>> 20260713140000_buyer_intents_tenant_rls.sql
-- buyer_intents + buyer_events: canonical migration + tenant RLS
-- Replaces permissive buyer_intents_all / buyer_events_all (true/true).
-- Tenant isolation via leads.agency_id → profile_agencies_for_auth().

-- ─── Tables (idempotent — may already exist from 20_buyer_intent.sql on prod) ─

CREATE TABLE IF NOT EXISTS public.buyer_intents (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id               text REFERENCES public.leads(id) ON DELETE CASCADE,

  deal_type             text NOT NULL CHECK (deal_type IN ('buy','rent','sell')),
  property_type         text NOT NULL CHECK (property_type IN ('flat','house','land','commercial')),
  primary_city          text NOT NULL DEFAULT '',
  budget_min            integer NOT NULL DEFAULT 0,
  budget_max            integer NOT NULL DEFAULT 0,
  time_horizon_months   text NOT NULL DEFAULT '6-12'
                          CHECK (time_horizon_months IN ('0-3','3-6','6-12','12+')),
  new_build_only        boolean NOT NULL DEFAULT false,
  needs_mortgage_help   boolean NOT NULL DEFAULT false,
  raw_focus_text        text NOT NULL DEFAULT '',
  client_segment        text NOT NULL DEFAULT 'other',
  buyer_readiness_score integer NOT NULL DEFAULT 0 CHECK (buyer_readiness_score BETWEEN 0 AND 100),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.buyer_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id    uuid REFERENCES public.buyer_intents(id) ON DELETE CASCADE,
  lead_id      text REFERENCES public.leads(id) ON DELETE SET NULL,
  event_type   text NOT NULL,
  property_id  text REFERENCES public.properties(id) ON DELETE SET NULL,
  meta         jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS client_segment        text,
  ADD COLUMN IF NOT EXISTS buyer_readiness_score integer;

CREATE UNIQUE INDEX IF NOT EXISTS buyer_intents_lead_id_unique
  ON public.buyer_intents (lead_id);

-- ─── updated_at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS buyer_intents_updated_at ON public.buyer_intents;
CREATE TRIGGER buyer_intents_updated_at
  BEFORE UPDATE ON public.buyer_intents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── RLS: tenant via leads.agency_id ──────────────────────────────────────────

ALTER TABLE public.buyer_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_events   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buyer_intents_all" ON public.buyer_intents;
DROP POLICY IF EXISTS "buyer_events_all" ON public.buyer_events;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'buyer_intents'
      AND policyname = 'buyer_intents_agency'
  ) THEN
    CREATE POLICY "buyer_intents_agency"
      ON public.buyer_intents FOR ALL
      TO authenticated
      USING (
        lead_id IN (
          SELECT id FROM public.leads
          WHERE agency_id IN (SELECT public.profile_agencies_for_auth())
        )
      )
      WITH CHECK (
        lead_id IN (
          SELECT id FROM public.leads
          WHERE agency_id IN (SELECT public.profile_agencies_for_auth())
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'buyer_events'
      AND policyname = 'buyer_events_agency'
  ) THEN
    CREATE POLICY "buyer_events_agency"
      ON public.buyer_events FOR ALL
      TO authenticated
      USING (
        lead_id IS NULL
        OR lead_id IN (
          SELECT id FROM public.leads
          WHERE agency_id IN (SELECT public.profile_agencies_for_auth())
        )
      )
      WITH CHECK (
        lead_id IS NULL
        OR lead_id IN (
          SELECT id FROM public.leads
          WHERE agency_id IN (SELECT public.profile_agencies_for_auth())
        )
      );
  END IF;
END $$;

-- >>> 20260713150000_inbound_auto_response.sql
-- Inbound auto-response v1: dedup timestamp on lead, opt-out on agency.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS auto_response_sent_at timestamptz;

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS auto_response_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.leads.auto_response_sent_at IS
  'Set after first inbound auto-response email; NULL = not yet sent.';

COMMENT ON COLUMN public.agencies.auto_response_enabled IS
  'When false, inbound gateway skips auto-response for this agency.';

-- >>> 20260713160000_agencies_contact_columns.sql
-- Optional agency contact columns for Reply-To / template phone (prod drift fix).

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text;

COMMENT ON COLUMN public.agencies.email IS
  'Public inbound Reply-To when set; otherwise owner profile email fallback.';

COMMENT ON COLUMN public.agencies.phone IS
  'Optional agency phone line in inbound auto-response template.';
