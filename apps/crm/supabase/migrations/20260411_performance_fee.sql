-- ============================================================
-- Revolis.AI – Performance Fee Tracking Infrastructure
-- Migration: 20260411_performance_fee.sql
-- ============================================================

-- Tabuľka pre tracking AI-sourced obchodov (Enterprise plán)
CREATE TABLE IF NOT EXISTS public.ai_sourced_deals (
  id                    UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id             UUID,
  lead_id               UUID          REFERENCES public.leads(id) ON DELETE SET NULL,
  property_id           UUID          REFERENCES public.properties(id) ON DELETE SET NULL,
  deal_value            DECIMAL(12,2) NOT NULL,
  commission_value      DECIMAL(12,2),
  ai_attribution_score  DECIMAL(3,2)  DEFAULT 0.0
                          CHECK (ai_attribution_score BETWEEN 0.0 AND 1.0),
  ai_actions            JSONB         DEFAULT '[]'::jsonb,
  status                TEXT          DEFAULT 'pending'
                          CHECK (status IN ('pending', 'confirmed', 'disputed')),
  -- Generated: 2% z komisie, max 500€ (len pre Enterprise)
  performance_fee       DECIMAL(10,2) GENERATED ALWAYS AS (
    CASE
      WHEN commission_value IS NOT NULL AND commission_value > 0
      THEN LEAST(commission_value * 0.02, 500.0)
      ELSE 0.0
    END
  ) STORED,
  created_at            TIMESTAMPTZ   DEFAULT NOW(),
  confirmed_at          TIMESTAMPTZ
);

-- ─── Indexy ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ai_sourced_deals_agency
  ON public.ai_sourced_deals(agency_id);

CREATE INDEX IF NOT EXISTS idx_ai_sourced_deals_lead
  ON public.ai_sourced_deals(lead_id);

CREATE INDEX IF NOT EXISTS idx_ai_sourced_deals_status
  ON public.ai_sourced_deals(status);

-- ─── RLS ──────────────────────────────────────────────────────

ALTER TABLE public.ai_sourced_deals ENABLE ROW LEVEL SECURITY;

-- Owner/manager vidí obchody svojej agentúry
CREATE POLICY "Owners can view their agency deals"
  ON public.ai_sourced_deals
  FOR SELECT
  USING (
    agency_id IN (
      SELECT p.agency_id
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role IN ('owner', 'manager')
    )
  );

-- Len systém (service role) môže vkladať záznamy
CREATE POLICY "Service role can insert deals"
  ON public.ai_sourced_deals
  FOR INSERT
  WITH CHECK (true);

-- Owner môže potvrdiť/zamietnuť obchod
CREATE POLICY "Owners can update deal status"
  ON public.ai_sourced_deals
  FOR UPDATE
  USING (
    agency_id IN (
      SELECT p.agency_id
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role IN ('owner', 'manager')
    )
  );

COMMENT ON TABLE public.ai_sourced_deals IS
  'Tracking AI-sourced obchodov pre Enterprise performance fee (2% z komisie, max 500€/obchod)';
COMMENT ON COLUMN public.ai_sourced_deals.ai_attribution_score IS
  '0.0 = žiadna AI attributácia, 1.0 = plná AI attributácia';
COMMENT ON COLUMN public.ai_sourced_deals.ai_actions IS
  'JSON pole AI akcií ktoré viedli k uzavretiu obchodu';
COMMENT ON COLUMN public.ai_sourced_deals.performance_fee IS
  'Automaticky počítaný: 2% z commission_value, max 500€';
