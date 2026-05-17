-- Keep matching reads bounded and index-backed.
-- Safe to run repeatedly.

create index if not exists idx_lpm_score_created
on public.lead_property_matches(score desc, created_at desc);

create index if not exists idx_lpm_lead_score_created
on public.lead_property_matches(lead_id, score desc, created_at desc);

create index if not exists idx_lpm_property_score_created
on public.lead_property_matches(property_id, score desc, created_at desc);

create index if not exists idx_lpm_status_score_created
on public.lead_property_matches(status, score desc, created_at desc);
