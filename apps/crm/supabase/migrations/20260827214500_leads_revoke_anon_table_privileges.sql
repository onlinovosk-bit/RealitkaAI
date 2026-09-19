-- L99: restore table-level 42501 for anon SELECT on public.leads.
-- Root cause (CI RLS): leads_tenant is authenticated-only, but leftover GRANT
-- SELECT to anon/PUBLIC made PostgREST return [] with error=null (empty-success)
-- instead of permission denied. Valuation inbound uses service_role
-- (api/valuation/submit, api/leads/inbound) — do not GRANT anon SELECT.
-- Keep authenticated RLS policy leads_tenant (20260616124500_rls_wave_a_leak_closure).

REVOKE ALL ON TABLE public.leads FROM anon;
REVOKE ALL ON TABLE public.leads FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.leads TO authenticated;
GRANT ALL ON TABLE public.leads TO service_role;
