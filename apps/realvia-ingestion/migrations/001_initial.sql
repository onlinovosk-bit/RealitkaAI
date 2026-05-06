-- Realvia Ingestion — Initial Schema
-- organization_id on every table + RLS + append-only history tables

BEGIN;

-- Reuse organizations table if shared DB, otherwise recreate
CREATE TABLE IF NOT EXISTS organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Reality Smolko')
ON CONFLICT (id) DO NOTHING;

-- ─── Listings — current canonical state ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS listings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor              TEXT NOT NULL DEFAULT 'realvia',
  vendor_listing_id   TEXT NOT NULL,
  -- Status
  status              TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','reserved','sold','withdrawn')),
  consecutive_misses  INT NOT NULL DEFAULT 0,   -- incremented each run where listing absent
  last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Core fields (vendor-agnostic)
  title               TEXT NOT NULL,
  description         TEXT,
  listing_type        TEXT NOT NULL DEFAULT 'other'
                      CHECK (listing_type IN ('apartment','house','land','commercial','other')),
  price               NUMERIC NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'EUR',
  area_m2             NUMERIC,
  rooms               NUMERIC,
  floor               INT,
  -- Location
  country             TEXT NOT NULL DEFAULT 'SK',
  region              TEXT,
  city                TEXT,
  district            TEXT,
  street              TEXT,
  lat                 NUMERIC,
  lon                 NUMERIC,
  -- Integrity
  raw_hash            TEXT NOT NULL,             -- SHA-256 of raw payload; change = new snapshot
  attributes          JSONB NOT NULL DEFAULT '{}',
  -- Timestamps
  first_seen_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, vendor, vendor_listing_id)
);

CREATE INDEX IF NOT EXISTS listings_org_vendor_idx  ON listings (organization_id, vendor);
CREATE INDEX IF NOT EXISTS listings_status_idx      ON listings (organization_id, status);
CREATE INDEX IF NOT EXISTS listings_city_idx        ON listings (organization_id, city);
CREATE INDEX IF NOT EXISTS listings_price_idx       ON listings (organization_id, price);
CREATE INDEX IF NOT EXISTS listings_last_seen_idx   ON listings (organization_id, last_seen_at DESC);

-- ─── Price History — append-only ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  listing_id      UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  price_from      NUMERIC NOT NULL,
  price_to        NUMERIC NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'EUR',
  delta_eur       NUMERIC GENERATED ALWAYS AS (price_to - price_from) STORED,
  observed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS price_history_listing_idx ON price_history (listing_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS price_history_org_idx     ON price_history (organization_id, observed_at DESC);

-- ─── Status History — append-only ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS status_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  listing_id      UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  status_from     TEXT NOT NULL,
  status_to       TEXT NOT NULL,
  reason          TEXT,           -- 'realvia_feed' | 'consecutive_misses' | 'manual'
  observed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS status_history_listing_idx ON status_history (listing_id, observed_at DESC);

-- ─── Media Assets ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  listing_id      UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  vendor_url      TEXT NOT NULL,
  cdn_url         TEXT,           -- our CDN URL after re-hosting (Phase 0 Q7)
  media_type      TEXT NOT NULL DEFAULT 'photo'
                  CHECK (media_type IN ('photo','floorplan','video')),
  sort_order      INT NOT NULL DEFAULT 0,
  checksum        TEXT,           -- SHA-256 of downloaded file
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (listing_id, vendor_url)
);

CREATE INDEX IF NOT EXISTS media_assets_listing_idx ON media_assets (listing_id, sort_order);

-- ─── Raw Snapshots — pointer table to object storage ─────────────────────────
CREATE TABLE IF NOT EXISTS raw_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  run_id          UUID,           -- FK set after ingestion_runs insert
  storage_key     TEXT NOT NULL,  -- e.g. realvia/smolko/2026/05/05/14/run_id.json.gz
  size_bytes      BIGINT,
  listing_count   INT,
  stored_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS raw_snapshots_org_idx ON raw_snapshots (organization_id, stored_at DESC);
CREATE INDEX IF NOT EXISTS raw_snapshots_run_idx ON raw_snapshots (run_id);

-- ─── Ingestion Runs ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ingestion_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor           TEXT NOT NULL DEFAULT 'realvia',
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at         TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'running'
                   CHECK (status IN ('running','success','failed','partial')),
  listings_seen    INT,
  listings_created INT,
  listings_updated INT,
  listings_withdrawn INT,
  parse_failures   INT NOT NULL DEFAULT 0,
  schema_drifts    INT NOT NULL DEFAULT 0,
  error_message    TEXT,
  duration_ms      INT GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (ended_at - started_at)) * 1000
  ) STORED
);

CREATE INDEX IF NOT EXISTS ingestion_runs_org_idx    ON ingestion_runs (organization_id, started_at DESC);
CREATE INDEX IF NOT EXISTS ingestion_runs_status_idx ON ingestion_runs (status) WHERE status = 'running';

-- ─── Outbox — pending events for NATS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS outbox (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,  -- ListingCreated|ListingUpdated|PriceChanged|StatusChanged|ListingRemoved
  aggregate_id    UUID NOT NULL,  -- listing_id
  payload         JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at    TIMESTAMPTZ     -- NULL = pending
);

CREATE INDEX IF NOT EXISTS outbox_pending_idx ON outbox (created_at) WHERE published_at IS NULL;

-- ─── Parse DLQ ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parse_dlq (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  run_id          UUID,
  vendor_listing_id TEXT,
  raw_payload     JSONB,
  error_message   TEXT NOT NULL,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS parse_dlq_org_idx      ON parse_dlq (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS parse_dlq_resolved_idx ON parse_dlq (resolved_at) WHERE resolved_at IS NULL;

-- ─── Updated-at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE OR REPLACE TRIGGER listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Row-Level Security ───────────────────────────────────────────────────────
ALTER TABLE listings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_snapshots    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_runs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox           ENABLE ROW LEVEL SECURITY;
ALTER TABLE parse_dlq        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_listings"       ON listings       FOR ALL USING (organization_id = current_setting('app.organization_id', true)::uuid);
CREATE POLICY "org_isolation_price_history"  ON price_history  FOR ALL USING (organization_id = current_setting('app.organization_id', true)::uuid);
CREATE POLICY "org_isolation_status_history" ON status_history FOR ALL USING (organization_id = current_setting('app.organization_id', true)::uuid);
CREATE POLICY "org_isolation_media_assets"   ON media_assets   FOR ALL USING (organization_id = current_setting('app.organization_id', true)::uuid);
CREATE POLICY "org_isolation_raw_snapshots"  ON raw_snapshots  FOR ALL USING (organization_id = current_setting('app.organization_id', true)::uuid);
CREATE POLICY "org_isolation_ingestion_runs" ON ingestion_runs FOR ALL USING (organization_id = current_setting('app.organization_id', true)::uuid);
CREATE POLICY "org_isolation_outbox"         ON outbox         FOR ALL USING (organization_id = current_setting('app.organization_id', true)::uuid);
CREATE POLICY "org_isolation_parse_dlq"      ON parse_dlq      FOR ALL USING (organization_id = current_setting('app.organization_id', true)::uuid);

COMMIT;
