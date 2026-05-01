-- Migration: 002_event_store
-- Creates the immutable event log table for Event Sourcing (Phase 1)
-- Run once against Supabase SQL editor

CREATE TABLE IF NOT EXISTS event_store (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_id    UUID        NOT NULL,
  aggregate_type  VARCHAR(64) NOT NULL,
  event_type      VARCHAR(128) NOT NULL,
  payload         JSONB       NOT NULL DEFAULT '{}',
  version         INTEGER     NOT NULL DEFAULT 1,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT event_store_version_positive CHECK (version > 0)
);

-- Fast lookup by aggregate (most common query: replay all events for one entity)
CREATE INDEX IF NOT EXISTS idx_event_store_aggregate
  ON event_store (aggregate_id, version ASC);

-- Fast lookup by event type (projections catching up)
CREATE INDEX IF NOT EXISTS idx_event_store_type
  ON event_store (event_type, occurred_at DESC);

-- Append-only: prevent updates and deletes
CREATE OR REPLACE RULE event_store_no_update AS
  ON UPDATE TO event_store DO INSTEAD NOTHING;

CREATE OR REPLACE RULE event_store_no_delete AS
  ON DELETE TO event_store DO INSTEAD NOTHING;

-- Row Level Security: service_role only writes, anon can never read
ALTER TABLE event_store ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_store_service_role_all
  ON event_store
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
