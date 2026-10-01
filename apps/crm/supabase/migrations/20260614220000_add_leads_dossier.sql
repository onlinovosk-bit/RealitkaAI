alter table public.leads
  add column if not exists dossier jsonb;

comment on column public.leads.dossier is
  'Research agent dossier (evidence-backed). Separate from ai_engine (triage AI).';
