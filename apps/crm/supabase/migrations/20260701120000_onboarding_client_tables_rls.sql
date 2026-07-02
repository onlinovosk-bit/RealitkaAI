-- B1 RLS hardening: client onboarding tables are service_role-only (no user-scoped access).
-- Orphan GET /api/onboarding/mvp removed — all callers use createServiceRoleClient.

alter table public.client_onboarding_messages enable row level security;

drop policy if exists "service_role_only" on public.client_onboarding_messages;
create policy "service_role_only" on public.client_onboarding_messages
  for all to service_role using (true) with check (true);

alter table public.client_onboarding_progress enable row level security;

drop policy if exists "service_role_only" on public.client_onboarding_progress;
create policy "service_role_only" on public.client_onboarding_progress
  for all to service_role using (true) with check (true);
