-- Legalizácia existujúceho PROD substrátu do active migration setu.
--
-- DÔVOD:
--   platform_events a ai_jobs existujú v PROD, ale nemajú CREATE TABLE
--   v žiadnej aktívnej migrácii (platform_events len v migrations-archive/,
--   ktorá sa neaplikuje; ai_jobs nikde). CI stavia ephemeral DB cez
--   `supabase db reset` z tohto adresára, takže obe tabuľky v CI chýbajú.
--   Následok: akákoľvek migrácia alebo test proti nim buď v CI spadne,
--   alebo sa musí guardovať cez IF EXISTS a tým sa stane falošne zelenou.
--
-- ROZSAH:
--   Táto migrácia NEMENÍ kontrakt. Reprodukuje presne nameraný PROD tvar
--   (stĺpce, typy, defaulty, constrainty, indexy, RLS, policy, realtime),
--   aby `supabase db reset` vytvoril identický substrát ako má PROD.
--   V PROD je celá migrácia no-op — všetko je guardované.
--   Existujúce PROD dáta sa nedotýka (žiadny DROP, ALTER COLUMN ani DELETE).
--
-- ZÁMERNE NEOPRAVENÉ (legalizujeme substrate as-is, nie jeho chyby):
--   - platform_events.agency_id je NULLABLE, lebo FK je ON DELETE SET NULL.
--   - policy platform_events_select_tenant má vetvu `agency_id IS NULL`,
--     ktorá sprístupní osirené eventy každému prihlásenému používateľovi.
--   Oboje je vedomý PROD stav. Akákoľvek zmena patrí do samostatnej brány.

-- ── platform_events ───────────────────────────────────────────────────────────

create table if not exists public.platform_events (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid references public.agencies(id) on delete set null,
  event_type text not null,
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_events_agency_created
  on public.platform_events (agency_id, created_at desc);

create index if not exists idx_platform_events_type_created
  on public.platform_events (event_type, created_at desc);

alter table public.platform_events enable row level security;

-- Presný PROD tvar policy vrátane `agency_id is null` vetvy. Nemeniť tu.
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'platform_events'
      and policyname = 'platform_events_select_tenant'
  ) then
    create policy platform_events_select_tenant
      on public.platform_events
      for select
      to authenticated
      using (
        agency_id is null
        or agency_id in (
          select p.agency_id
          from public.profiles p
          where p.auth_user_id = auth.uid()
            and p.agency_id is not null
        )
      );
  end if;
end $$;

-- platform_events je v PROD členom supabase_realtime publikácie
-- (apps/crm/src/hooks/usePlatformRealtime.ts na tom stojí).
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname    = 'supabase_realtime'
         and schemaname = 'public'
         and tablename  = 'platform_events'
     )
  then
    alter publication supabase_realtime add table public.platform_events;
  end if;
end $$;

-- ── ai_jobs ───────────────────────────────────────────────────────────────────

create table if not exists public.ai_jobs (
  id           uuid primary key default gen_random_uuid(),
  job_type     text not null,
  payload      jsonb not null default '{}'::jsonb,
  status       text not null default 'pending'
                 check (status in ('pending', 'processing', 'completed', 'dead')),
  retry_count  integer not null default 0,
  max_retries  integer not null default 5,
  run_after    timestamptz not null default now(),
  last_error   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  started_at   timestamptz,
  completed_at timestamptz
);

create index if not exists ai_jobs_runner_poll
  on public.ai_jobs (run_after, created_at)
  where status = 'pending';

create index if not exists ai_jobs_type_created
  on public.ai_jobs (job_type, created_at desc);

-- RLS zapnuté, ZÁMERNE bez policies — presne ako PROD.
-- Prístup má len service_role (obchádza RLS); authenticated/anon nemá žiadnu
-- policy, teda deny-all. Nepridávať policy v tejto migrácii.
alter table public.ai_jobs enable row level security;
