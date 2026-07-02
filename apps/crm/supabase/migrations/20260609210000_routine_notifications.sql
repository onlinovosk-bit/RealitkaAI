-- Routine notifications — agency-scoped outputs for Seller Rescue / CEO Command.
-- Separate from public.notifications (coaching engine: user_id + content schema).

CREATE TABLE IF NOT EXISTS routine_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  profile_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type        TEXT NOT NULL,
  priority    TEXT NOT NULL DEFAULT 'normal',
  title       TEXT NOT NULL,
  body        TEXT,
  data        JSONB,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  expires_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_routine_notifications_agency
  ON routine_notifications(agency_id);

CREATE INDEX IF NOT EXISTS idx_routine_notifications_unread
  ON routine_notifications(agency_id, read_at)
  WHERE read_at IS NULL;

ALTER TABLE routine_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "routine_notifications_agency_isolation" ON routine_notifications;
CREATE POLICY "routine_notifications_agency_isolation" ON routine_notifications
  FOR ALL USING (
    agency_id IN (
      SELECT agency_id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

COMMENT ON TABLE routine_notifications IS
  'Revolis Routines výstupy — seller rescue, deal risk, CEO command.';
