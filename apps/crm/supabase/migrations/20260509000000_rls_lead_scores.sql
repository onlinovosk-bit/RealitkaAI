-- RLS for lead_scores (enterprise BRI scoring)
-- lead_scores.lead_id references leads.id; tenant isolation via leads.agency_id
--
-- Also covers:
--   outreach_logs   — agency isolation via lead_id -> leads.agency_id
--   property_price_trail — agency isolation via profile_id -> profiles -> agency membership
--
-- Tables NOT included:
--   platform_events  — table does not exist in any migration
--   notifications    — intentionally user-scoped (user_id = auth.uid()), no agency column

-- ── lead_scores ────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'lead_scores'
  ) THEN
    ALTER TABLE public.lead_scores ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename  = 'lead_scores'
        AND policyname = 'lead_scores_agency'
    ) THEN
      CREATE POLICY "lead_scores_agency"
        ON public.lead_scores FOR ALL
        USING (
          lead_id IN (
            SELECT id FROM public.leads
            WHERE agency_id IN (SELECT profile_agencies_for_auth())
          )
        )
        WITH CHECK (
          lead_id IN (
            SELECT id FROM public.leads
            WHERE agency_id IN (SELECT profile_agencies_for_auth())
          )
        );
    END IF;
  END IF;
END $$;

-- ── outreach_logs ──────────────────────────────────────────────────────────────
-- Existing policy "owners read own outreach logs" is profile-scoped only.
-- Add agency-level ALL policy so team members within the same agency see records.

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'outreach_logs'
  ) THEN
    ALTER TABLE public.outreach_logs ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename  = 'outreach_logs'
        AND policyname = 'outreach_logs_agency'
    ) THEN
      -- outreach_logs.lead_id is TEXT matching leads.id
      CREATE POLICY "outreach_logs_agency"
        ON public.outreach_logs FOR ALL
        USING (
          lead_id IS NULL
          OR lead_id IN (
            SELECT id FROM public.leads
            WHERE agency_id IN (SELECT profile_agencies_for_auth())
          )
        )
        WITH CHECK (
          lead_id IS NULL
          OR lead_id IN (
            SELECT id FROM public.leads
            WHERE agency_id IN (SELECT profile_agencies_for_auth())
          )
        );
    END IF;
  END IF;
END $$;

-- ── property_price_trail ───────────────────────────────────────────────────────
-- Existing policy is profile-scoped (auth.uid()). Add agency-level policy so
-- all agency members can read/write price trail entries for their agency leads.

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'property_price_trail'
  ) THEN
    ALTER TABLE public.property_price_trail ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename  = 'property_price_trail'
        AND policyname = 'property_price_trail_agency'
    ) THEN
      -- profile_id links to profiles; profile_agencies_for_auth() returns agency_ids
      -- for all profiles belonging to the current auth user.
      CREATE POLICY "property_price_trail_agency"
        ON public.property_price_trail FOR ALL
        USING (
          profile_id IN (
            SELECT id FROM public.profiles
            WHERE agency_id IN (SELECT profile_agencies_for_auth())
          )
        )
        WITH CHECK (
          profile_id IN (
            SELECT id FROM public.profiles
            WHERE agency_id IN (SELECT profile_agencies_for_auth())
          )
        );
    END IF;
  END IF;
END $$;
