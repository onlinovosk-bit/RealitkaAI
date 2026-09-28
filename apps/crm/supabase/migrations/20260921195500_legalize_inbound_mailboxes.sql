-- Legalizácia existujúceho PROD substrátu do active migration setu.
--
-- DÔVOD:
--   inbound_mailboxes existuje v PROD (11 riadkov, nesie smerovanie e-mailového
--   ingestu na agentúru), ale nemá CREATE TABLE nikde v repozitári — ani
--   v migrations/, ani v migrations-archive/. CI stavia ephemeral DB cez
--   `supabase db reset` z tohto adresára, takže tabuľka v CI neexistuje
--   a akákoľvek migrácia či test proti nej spadne.
--   Rovnaký druh driftu ako platform_events a ai_jobs v #619.
--
-- ROZSAH:
--   Reprodukuje nameraný PROD tvar. V PROD je celá migrácia no-op.
--   Žiadny DROP, žiadny ALTER COLUMN, žiadny backfill.
--
-- ZÁMERNE NEOPRAVENÉ (legalizujeme substrát as-is, nie jeho chyby):
--   - `agency_id` je NOT NULL, ale NEMÁ foreign key na agencies(id).
--     V PROD taký constraint neexistuje (porovnaj valuation_tenants, kde je).
--     Doplnenie FK je zmena kontraktu a patrí do samostatnej brány.
--
-- NEMERANÉ:
--   RLS je v PROD zapnuté, ale konkrétne policy neboli odčítané. Tu sa preto
--   RLS iba zapína, bez policy — to je deny-all pre anon aj authenticated,
--   teda PRÍSNEJŠIE než PROD, nikdy benevolentnejšie. Ingest beží cez
--   service-role klienta, ktorý RLS obchádza, takže tým nič nezlomí.
--   Ak sa PROD policy raz odčítajú, doplnia sa samostatnou migráciou.

create table if not exists public.inbound_mailboxes (
  id               uuid primary key default gen_random_uuid(),
  agency_id        uuid not null,
  email            text not null unique,
  active           boolean not null default true,
  last_received_at timestamptz,
  created_at       timestamptz default now()
);

alter table public.inbound_mailboxes enable row level security;
