-- Weekend 2026-10-16. Súbor v PR, na PROD sa NEAPLIKUJE, kým founder nepovie.
-- Tri vzťahy, ktoré kód číta a migrácia doteraz nemala:
--   event_store          (src/infra/db/eventstore/EventStore.ts)
--   outreach_log         (src/lib/ai/action-executor.ts; iné než outreach_logs)
--   team_member_permissions (src/app/api/nav/permissions/route.ts)
-- public.events už migrácia 20260425231407 zakladá; tento súbor ju neduplikuje.
-- Allowlist sa nemení: schema-guard porovnáva allowlist s LIVE schémou a nové
-- mená by hlásil ako missing, kým nie sú naozaj v PROD.

CREATE TABLE IF NOT EXISTS public.event_store (
  id              UUID        PRIMARY KEY,
  aggregate_id    TEXT        NOT NULL,
  aggregate_type  TEXT        NOT NULL,
  event_type      TEXT        NOT NULL,
  payload         JSONB       NOT NULL DEFAULT '{}',
  version         INTEGER     NOT NULL DEFAULT 1,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_store_aggregate
  ON public.event_store (aggregate_id, version);

ALTER TABLE public.event_store ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_store_service_role ON public.event_store;
CREATE POLICY event_store_service_role
  ON public.event_store FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.outreach_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     TEXT        NOT NULL,
  channel     TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  status      TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.outreach_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS outreach_log_service_role ON public.outreach_log;
CREATE POLICY outreach_log_service_role
  ON public.outreach_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Cookie insert z action-executor prejde len ak lead patrí agentúre volajúceho.
DROP POLICY IF EXISTS outreach_log_insert_own_agency_lead ON public.outreach_log;
CREATE POLICY outreach_log_insert_own_agency_lead
  ON public.outreach_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.leads l
      JOIN public.profiles p ON p.agency_id = l.agency_id
      WHERE l.id::text = outreach_log.lead_id
        AND p.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS outreach_log_select_own_agency ON public.outreach_log;
CREATE POLICY outreach_log_select_own_agency
  ON public.outreach_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.leads l
      JOIN public.profiles p ON p.agency_id = l.agency_id
      WHERE l.id::text = outreach_log.lead_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.team_member_permissions (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_profile_id            UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_license_id             UUID        NOT NULL,
  can_see_team_pipeline       BOOLEAN     NOT NULL DEFAULT false,
  can_see_colleague_leads     BOOLEAN     NOT NULL DEFAULT false,
  can_see_team_forecast       BOOLEAN     NOT NULL DEFAULT false,
  can_see_shared_contacts     BOOLEAN     NOT NULL DEFAULT false,
  can_export_contacts         BOOLEAN     NOT NULL DEFAULT false,
  can_delete_leads            BOOLEAN     NOT NULL DEFAULT false,
  can_edit_colleagues_tasks   BOOLEAN     NOT NULL DEFAULT false,
  UNIQUE (agent_profile_id, team_license_id)
);

ALTER TABLE public.team_member_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS team_member_permissions_select_self ON public.team_member_permissions;
CREATE POLICY team_member_permissions_select_self
  ON public.team_member_permissions FOR SELECT
  TO authenticated
  USING (
    agent_profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS team_member_permissions_service_role ON public.team_member_permissions;
CREATE POLICY team_member_permissions_service_role
  ON public.team_member_permissions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
