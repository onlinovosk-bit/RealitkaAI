create table if not exists public.client_onboarding_progress (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  contact_name text,
  contact_email text not null,
  agents_count integer not null default 1,
  checklist jsonb not null default '{}'::jsonb,
  readiness_score integer not null default 0,
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists client_onboarding_progress_company_email_idx
  on public.client_onboarding_progress (company, contact_email);

create table if not exists public.client_onboarding_messages (
  id uuid primary key default gen_random_uuid(),
  progress_id uuid not null references public.client_onboarding_progress(id) on delete cascade,
  message_day text not null check (message_day in ('d1','d3','d7')),
  scheduled_for timestamptz not null,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists client_onboarding_messages_unique_idx
  on public.client_onboarding_messages (progress_id, message_day);

create index if not exists client_onboarding_messages_due_idx
  on public.client_onboarding_messages (status, scheduled_for);

create or replace function public.set_updated_at_onboarding_progress()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_onboarding_progress_updated_at on public.client_onboarding_progress;
create trigger trg_onboarding_progress_updated_at
before update on public.client_onboarding_progress
for each row execute function public.set_updated_at_onboarding_progress();

