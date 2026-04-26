-- ================================================================
-- Revolis.AI — L99 Ghost Monitor (Kataster Pulse)
-- Migration: ghost_monitor
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.watched_parcels (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id      UUID,
  lead_id           TEXT,
  parcel_id         TEXT        NOT NULL,
  watch_label       TEXT,
  last_hash         TEXT,
  status            TEXT        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'archived')),
  check_interval_h  SMALLINT    NOT NULL DEFAULT 24,
  last_checked_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, parcel_id)
);

CREATE INDEX IF NOT EXISTS idx_watched_parcels_status
  ON public.watched_parcels(status);
CREATE INDEX IF NOT EXISTS idx_watched_parcels_profile
  ON public.watched_parcels(profile_id, status);

CREATE TABLE IF NOT EXISTS public.kataster_events (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  watched_parcel_id  UUID        REFERENCES public.watched_parcels(id) ON DELETE CASCADE,
  lead_id            TEXT,
  parcel_id          TEXT        NOT NULL,
  event_type         TEXT        NOT NULL DEFAULT 'LV_CHANGE_DETECTED',
  severity           TEXT        NOT NULL DEFAULT 'high'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  old_hash           TEXT,
  new_hash           TEXT,
  payload            JSONB       NOT NULL DEFAULT '{}',
  detected_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kataster_events_profile_detected
  ON public.kataster_events(profile_id, detected_at DESC);

ALTER TABLE public.watched_parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kataster_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users manage own watched parcels" ON public.watched_parcels;
CREATE POLICY "users manage own watched parcels"
  ON public.watched_parcels FOR ALL
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "users read own kataster events" ON public.kataster_events;
CREATE POLICY "users read own kataster events"
  ON public.kataster_events FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "service role full kataster access" ON public.kataster_events;
CREATE POLICY "service role full kataster access"
  ON public.kataster_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.record_kataster_event(
  p_profile_id UUID,
  p_parcel_id TEXT,
  p_event_type TEXT DEFAULT 'LV_CHANGE_DETECTED',
  p_severity TEXT DEFAULT 'high',
  p_watched_parcel_id UUID DEFAULT NULL,
  p_lead_id TEXT DEFAULT NULL,
  p_old_hash TEXT DEFAULT NULL,
  p_new_hash TEXT DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.kataster_events(
    profile_id, watched_parcel_id, lead_id, parcel_id,
    event_type, severity, old_hash, new_hash, payload
  )
  VALUES (
    p_profile_id, p_watched_parcel_id, p_lead_id, p_parcel_id,
    p_event_type, p_severity, p_old_hash, p_new_hash, p_payload
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.watched_parcels IS
  'L99 Ghost Monitor watchlist. Stores parcel fingerprints and watch state per profile.';
COMMENT ON TABLE public.kataster_events IS
  'Detected cadastral changes (hash diff events) for watched parcels.';
