-- ACTIVITIES-FEED-CHECK krok 2: `activity_stream` musí rešpektovať tenantové RLS politiky `activities`.
--
-- Pohľad bol vlastnený `postgres` bez `security_invoker`, teda obchádzal RLS: po REVOKE pre `anon` (20261001140000)
-- ho `authenticated` stále čítal celý (193 riadkov, 187 bez leadu — cudzie e-maily/telefóny).
-- S `security_invoker = true` sa pohľad vyhodnocuje s právami volajúceho, takže platí `activities_tenant_select`.
--
-- Aplikované v PROD 2026-10-01 (execute_sql). Overené ako `authenticated` (viditeľné celkom / bez leadu):
-- pred 193/187 pre každého; po agentúra 1111…: 3/0, 8f3a…: 0/0, b101…: 3/0, dbbb…: 0/0.
-- `anon`: SELECT false (od 20261001140000).
--
-- ROLLBACK: ALTER VIEW public.activity_stream SET (security_invoker = false);  -- NEROBIŤ, obnoví únik.

ALTER VIEW public.activity_stream SET (security_invoker = true);
