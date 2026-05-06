-- Revenue Intelligence — Week 2 Schema
-- Adds: demo_outcomes, sequence_logs, conversions, ab_tests, agent_recommendations

BEGIN;

-- ─── Demo Outcomes (scoring data captured after demo call) ────────────────────
CREATE TABLE IF NOT EXISTS demo_outcomes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  demo_request_id       UUID NOT NULL REFERENCES demo_requests(id) ON DELETE CASCADE,
  -- Scoring inputs (from sales rep after demo)
  steps_completed       INTEGER[],
  aha_moment            BOOLEAN NOT NULL DEFAULT false,
  leads_recognized      INTEGER,
  estimated_lost_deals  INTEGER,
  has_system            BOOLEAN,
  pre_demo_engaged      BOOLEAN NOT NULL DEFAULT false,
  team_size             INTEGER,
  leads_per_month       INTEGER,
  open_confirmed        BOOLEAN NOT NULL DEFAULT false,
  interest_level        TEXT CHECK (interest_level IN ('high', 'medium', 'low', 'none')),
  est_loss_eur          NUMERIC,
  decision              TEXT CHECK (decision IN ('start_now', 'not_now', 'thinking', 'no')),
  -- Computed
  score                 INTEGER NOT NULL DEFAULT 0,
  bucket                TEXT NOT NULL DEFAULT 'LOW' CHECK (bucket IN ('HIGH', 'MEDIUM', 'LOW')),
  signals               JSONB NOT NULL DEFAULT '[]',
  scored_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (demo_request_id)
);

CREATE INDEX IF NOT EXISTS demo_outcomes_org_idx    ON demo_outcomes (organization_id);
CREATE INDEX IF NOT EXISTS demo_outcomes_bucket_idx ON demo_outcomes (organization_id, bucket);

-- ─── Sequence Logs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sequence_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  demo_request_id UUID REFERENCES demo_requests(id) ON DELETE SET NULL,
  sequence_type   TEXT NOT NULL CHECK (sequence_type IN ('high', 'medium', 'retargeting')),
  day             INTEGER,
  variant         TEXT NOT NULL DEFAULT 'A' CHECK (variant IN ('A', 'B')),
  email           TEXT,
  job_id          TEXT,
  sent_at         TIMESTAMPTZ,
  opened_at       TIMESTAMPTZ,
  replied_at      TIMESTAMPTZ,
  clicked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS seq_logs_org_idx  ON sequence_logs (organization_id);
CREATE INDEX IF NOT EXISTS seq_logs_demo_idx ON sequence_logs (demo_request_id);
CREATE INDEX IF NOT EXISTS seq_logs_type_idx ON sequence_logs (organization_id, sequence_type);

-- ─── Conversions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  demo_request_id   UUID REFERENCES demo_requests(id) ON DELETE SET NULL,
  trial_started_at  TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  churned_at        TIMESTAMPTZ,
  plan              TEXT,
  amount_eur        NUMERIC,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS conversions_org_idx    ON conversions (organization_id);
CREATE INDEX IF NOT EXISTS conversions_paid_idx   ON conversions (organization_id, paid_at DESC);

-- ─── A/B Tests ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ab_tests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  test_name         TEXT NOT NULL,
  variant           TEXT NOT NULL,
  demo_count        INTEGER NOT NULL DEFAULT 0,
  conversion_count  INTEGER NOT NULL DEFAULT 0,
  conversion_rate   NUMERIC,
  started_at        TIMESTAMPTZ,
  ended_at          TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, test_name, variant)
);

CREATE INDEX IF NOT EXISTS ab_tests_org_idx ON ab_tests (organization_id, test_name);

-- ─── Agent Recommendations (Week 3 — schema ready now) ───────────────────────
CREATE TABLE IF NOT EXISTS agent_recommendations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  week            TEXT NOT NULL,      -- ISO week e.g. '2026-W19'
  analysis        TEXT,
  recommendations JSONB NOT NULL DEFAULT '[]',
  kpis_snapshot   JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_recs_org_idx  ON agent_recommendations (organization_id, week DESC);

-- ─── RLS on new tables ───────────────────────────────────────────────────────
ALTER TABLE demo_outcomes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_tests               ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_recommendations  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_demo_outcomes"
  ON demo_outcomes FOR ALL
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY "org_isolation_sequence_logs"
  ON sequence_logs FOR ALL
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY "org_isolation_conversions"
  ON conversions FOR ALL
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY "org_isolation_ab_tests"
  ON ab_tests FOR ALL
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY "org_isolation_agent_recommendations"
  ON agent_recommendations FOR ALL
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

COMMIT;
