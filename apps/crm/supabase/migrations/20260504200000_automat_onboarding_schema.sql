-- Agency scraping & outbound campaign schema
-- Tabuľky pre automatický discovery agentúr z portálov + outbound pipeline.

-- ─────────────────────────────────────────────
-- projects  (základ pre multi-tenancy izoláciu)
-- ─────────────────────────────────────────────
create table if not exists public.projects (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  tenant_id  uuid,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

-- ─────────────────────────────────────────────
-- agencies
-- ─────────────────────────────────────────────
create table if not exists public.agencies (
  id                  uuid        primary key default gen_random_uuid(),
  tenant_id           uuid,
  external_id         text        not null,
  portal              text        not null,
  name                text        not null,
  city                text,
  address             text,
  phone               text,
  email               text,
  website             text,
  country             text        not null default 'SK',
  -- počet aktívnych inzerátov podľa posledného snapshotu
  listings_count      integer     not null default 0,
  opportunity_score   numeric(5,2) not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint agencies_portal_external_id_key unique (portal, external_id)
);

create index if not exists idx_agencies_city
  on public.agencies (city);

create index if not exists idx_agencies_tenant_score
  on public.agencies (tenant_id, opportunity_score desc);

alter table public.agencies enable row level security;

-- updated_at auto-trigger
create or replace function public.set_updated_at_agencies()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_agencies_updated_at on public.agencies;
create trigger trg_agencies_updated_at
before update on public.agencies
for each row execute function public.set_updated_at_agencies();

-- ─────────────────────────────────────────────
-- listings_snapshot
-- Historická rada počtu inzerátov agentúry (1 riadok = 1 scraping run).
-- ─────────────────────────────────────────────
create table if not exists public.listings_snapshot (
  id              uuid        primary key default gen_random_uuid(),
  agency_id       uuid        not null references public.agencies(id) on delete cascade,
  portal          text        not null,
  listings_count  integer     not null default 0,
  -- raw scraping output pre prípadnú re-analýzu
  url             text,
  title           text,
  description_raw text,
  price           numeric,
  city            text,
  region          text,
  snapshotted_at  timestamptz not null default now(),
  tenant_id       uuid,
  project_id      uuid
);

create index if not exists idx_listings_snapshot_agency
  on public.listings_snapshot (agency_id);

create index if not exists idx_listings_snapshot_time
  on public.listings_snapshot (snapshotted_at desc);

alter table public.listings_snapshot enable row level security;

-- ─────────────────────────────────────────────
-- agency_signals
-- Signály slabiny/príležitosti detekované počas scrapingu.
-- ─────────────────────────────────────────────
create table if not exists public.agency_signals (
  id            uuid        primary key default gen_random_uuid(),
  agency_id     uuid        not null references public.agencies(id) on delete cascade,
  source        text        not null,
  signal_type   text        not null,
  value_numeric numeric,
  value_text    text,
  detected_at   timestamptz not null default now(),
  tenant_id     uuid,
  project_id    uuid
);

create index if not exists idx_agency_signals_type
  on public.agency_signals (agency_id, signal_type);

alter table public.agency_signals enable row level security;

-- ─────────────────────────────────────────────
-- outbound_campaigns
-- ─────────────────────────────────────────────
create table if not exists public.outbound_campaigns (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  -- kanál: email | sms | linkedin
  channel    text        not null default 'email',
  -- stav: draft | active | paused | completed
  status     text        not null default 'draft',
  tenant_id  uuid,
  project_id uuid,
  created_at timestamptz not null default now()
);

alter table public.outbound_campaigns enable row level security;

-- ─────────────────────────────────────────────
-- outbound_messages
-- ─────────────────────────────────────────────
create table if not exists public.outbound_messages (
  id               uuid        primary key default gen_random_uuid(),
  campaign_id      uuid        not null references public.outbound_campaigns(id) on delete cascade,
  agency_id        uuid        references public.agencies(id) on delete set null,
  recipient_email  text,
  recipient_name   text,
  subject          text,
  body             text,
  -- stav: pending | sent | delivered | opened | clicked | replied | failed
  status           text        not null default 'pending',
  send_at          timestamptz,
  sent_at          timestamptz,
  delivered_at     timestamptz,
  opened_at        timestamptz,
  clicked_at       timestamptz,
  replied_at       timestamptz,
  tenant_id        uuid,
  project_id       uuid,
  created_at       timestamptz not null default now()
);

-- "due messages" query: WHERE status = 'pending' AND send_at <= now()
create index if not exists idx_outbound_messages_due
  on public.outbound_messages (status, send_at);

alter table public.outbound_messages enable row level security;
