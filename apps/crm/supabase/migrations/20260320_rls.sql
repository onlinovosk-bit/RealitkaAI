-- ENABLE RLS
alter table public.saas_leads enable row level security;
alter table public.saas_lead_notes enable row level security;

-- POLICY: user sees own leads
create policy "Users can view their leads"
on public.saas_leads
for select
using (auth.uid() = owner_profile_id or owner_profile_id is null);

-- POLICY: insert
create policy "Users can insert leads"
on public.saas_leads
for insert
with check (true);

-- POLICY: update
create policy "Users can update own leads"
on public.saas_leads
for update
using (auth.uid() = owner_profile_id or owner_profile_id is null);

-- NOTES
create policy "Users can view notes"
on public.saas_lead_notes
for select
using (true);

create policy "Users can insert notes"
on public.saas_lead_notes
for insert
with check (true);
