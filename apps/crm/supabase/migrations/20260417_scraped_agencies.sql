-- Prospecting pipeline: scraped real-estate agencies (distinct from tenant table public.agencies)

create table if not exists public.scraped_agencies (
  id uuid primary key default gen_random_uuid(),
  external_key text not null unique,
  name text not null,
  city text,
  listings_count integer not null default 0,
  score integer not null default 0,
  source text not null default 'nehnutelnosti.sk',
  source_url text,
  raw_meta jsonb,
  scraped_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_scraped_agencies_score on public.scraped_agencies (score desc);
create index if not exists idx_scraped_agencies_scraped_at on public.scraped_agencies (scraped_at desc);

alter table public.scraped_agencies enable row level security;

drop policy if exists "scraped_agencies_select_authenticated" on public.scraped_agencies;
create policy "scraped_agencies_select_authenticated"
  on public.scraped_agencies for select
  to authenticated
  using (true);

-- Zápisy cez SUPABASE_SERVICE_ROLE_KEY v API (service role obchádza RLS)

comment on table public.scraped_agencies is 'Outbound prospect agencies from scraper; not SaaS tenant agencies.';
