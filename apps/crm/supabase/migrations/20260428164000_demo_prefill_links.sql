create table if not exists public.demo_prefill_links (
  token text primary key,
  agency text not null,
  rep text,
  name text,
  email text,
  phone text,
  city text,
  agents integer,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists demo_prefill_links_expires_idx
  on public.demo_prefill_links (expires_at);

