-- Fix CI/ephemeral RLS failure:
-- enrichment_log policy must not directly read public.profiles from caller context.
-- Use security-definer resolver profile_agencies_for_auth() instead.

drop policy if exists "enrichment_log_agency_isolation" on public.enrichment_log;

create policy "enrichment_log_agency_isolation"
  on public.enrichment_log for all
  using (
    agency_id in (select public.profile_agencies_for_auth())
  )
  with check (
    agency_id in (select public.profile_agencies_for_auth())
  );
