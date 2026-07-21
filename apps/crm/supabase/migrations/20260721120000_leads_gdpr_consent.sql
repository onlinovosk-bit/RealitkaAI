-- Valuation widget + inbound leads: auditable GDPR consent timestamp
alter table public.leads
  add column if not exists gdpr_consent_at timestamptz,
  add column if not exists gdpr_consent_version text;

comment on column public.leads.gdpr_consent_at is
  'When the data subject acknowledged privacy policy (widget / form submit).';
comment on column public.leads.gdpr_consent_version is
  'Version string of the consent copy shown at submit time.';
