-- Revenue Intelligence — Week 1 Schema
-- Multi-tenant: organization_id on every table + RLS

BEGIN;

-- ─── Organizations ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Demo Requests ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS demo_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  name            TEXT,
  company         TEXT,
  source          TEXT NOT NULL DEFAULT 'web',
  score           INT,            -- 0-100 lead quality
  status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','disqualified','closed_won','closed_lost')),
  outcome         TEXT,           -- filled after demo call
  hubspot_deal_id TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS demo_requests_org_idx    ON demo_requests (organization_id);
CREATE INDEX IF NOT EXISTS demo_requests_status_idx ON demo_requests (organization_id, status);
CREATE INDEX IF NOT EXISTS demo_requests_created_idx ON demo_requests (organization_id, created_at DESC);

-- ─── Events ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  demo_request_id UUID REFERENCES demo_requests(id) ON DELETE SET NULL,
  event_type      TEXT NOT NULL,  -- e.g. 'demo_booked', 'demo_completed', 'email_opened', 'hubspot_deal_updated'
  source          TEXT NOT NULL DEFAULT 'internal', -- 'internal' | 'hubspot' | 'email' | 'web'
  payload         JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS events_org_idx      ON events (organization_id);
CREATE INDEX IF NOT EXISTS events_type_idx     ON events (organization_id, event_type);
CREATE INDEX IF NOT EXISTS events_demo_idx     ON events (demo_request_id);
CREATE INDEX IF NOT EXISTS events_created_idx  ON events (organization_id, created_at DESC);

-- ─── Email Sequences (Week 2 — table only) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS email_sequence_enrollments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  demo_request_id UUID NOT NULL REFERENCES demo_requests(id) ON DELETE CASCADE,
  sequence_name   TEXT NOT NULL,
  step            INT NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','cancelled')),
  next_send_at    TIMESTAMPTZ,
  enrolled_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (demo_request_id, sequence_name)
);

CREATE INDEX IF NOT EXISTS email_seq_org_idx      ON email_sequence_enrollments (organization_id);
CREATE INDEX IF NOT EXISTS email_seq_next_idx     ON email_sequence_enrollments (next_send_at) WHERE status = 'active';

-- ─── KPI Snapshots ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kpi_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_start    TIMESTAMPTZ NOT NULL,
  period_end      TIMESTAMPTZ NOT NULL,
  demos_requested INT NOT NULL DEFAULT 0,
  demos_completed INT NOT NULL DEFAULT 0,
  demos_converted INT NOT NULL DEFAULT 0,
  conversion_rate NUMERIC(5,2),
  avg_score       NUMERIC(5,2),
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kpi_snapshots_org_idx ON kpi_snapshots (organization_id, period_start DESC);

-- ─── Updated-at trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER demo_requests_updated_at
  BEFORE UPDATE ON demo_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER email_seq_updated_at
  BEFORE UPDATE ON email_sequence_enrollments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Row-Level Security ──────────────────────────────────────────────────────
ALTER TABLE organizations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_requests              ENABLE ROW LEVEL SECURITY;
ALTER TABLE events                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_snapshots              ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (used by this Express service with service_role key)
-- Application users are isolated by organization_id via RLS policies below

CREATE POLICY "org_isolation_demo_requests"
  ON demo_requests FOR ALL
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY "org_isolation_events"
  ON events FOR ALL
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY "org_isolation_email_seq"
  ON email_sequence_enrollments FOR ALL
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY "org_isolation_kpi_snapshots"
  ON kpi_snapshots FOR ALL
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

-- ─── Seed: default organization (dev only) ───────────────────────────────────
INSERT INTO organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Revolis.AI Dev')
ON CONFLICT (id) DO NOTHING;

COMMIT;
