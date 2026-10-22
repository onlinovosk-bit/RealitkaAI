-- EMAIL-SUPPRESSION-01: zoznam adries, na ktoré sa už nesmie posielať.
--
-- Prečo: odchádzajúci e-mail (`sendApprovedOutreach`) doteraz nepoznal ani
-- odhlásenie, ani tvrdý bounce, ani sťažnosť na spam (nález F-01). Posielanie
-- na adresy, ktoré sa odhlásili alebo natvrdo odrazili, ničí reputáciu domény
-- a pri odhlásení porušuje povinnosť umožniť odmietnutie ďalších správ.
--
-- Čo sa ukladá: IBA odtlačok adresy (SHA-256 z normalizovanej adresy), dôvod
-- a rozsah. Nikdy samotná adresa, meno ani obsah správy — minimalizácia
-- údajov. Odtlačok je pseudonymizácia, nie anonymizácia: kto pozná adresu,
-- vie odtlačok vypočítať a overiť, že je na zozname. To stačí na účel
-- (nesmieme jej písať) a nestačí na prehľadávanie zoznamu.
--
-- Rozsah (`scope_key`):
--   'global'      — tvrdý bounce, sťažnosť, potlačenie u Resendu: adresa je
--                   nedoručiteľná alebo nechcená pre všetky agentúry.
--   <agency uuid> — odhlásenie: vzťahuje sa na odosielateľa (agentúru), od
--                   ktorého správa prišla, nie na iné agentúry.
--
-- Aditívne a vratné (DROP TABLE). Píše a číta iba service role (webhook,
-- odhlasovací odkaz, odosielanie). RLS zapnutá s výslovnou politikou
-- deny-all pre anon aj authenticated: fail-closed.
-- Retencia: bez automatického mazania. Záznam o odhlásení musí trvať, kým
-- trvá povinnosť nepísať (inak by sa adresa po vymazaní znova oslovila).

create table if not exists public.email_suppressions (
  id          uuid        primary key default gen_random_uuid(),
  email_hash  text        not null check (email_hash ~ '^[0-9a-f]{64}$'),
  scope_key   text        not null,
  reason      text        not null check (reason in ('unsubscribe', 'hard_bounce', 'complaint', 'suppressed')),
  source      text        not null,
  created_at  timestamptz not null default now(),
  unique (email_hash, scope_key, reason)
);

create index if not exists email_suppressions_lookup_idx
  on public.email_suppressions (email_hash, scope_key);

alter table public.email_suppressions enable row level security;

revoke all on public.email_suppressions from anon, authenticated;

create policy email_suppressions_deny_all
  on public.email_suppressions
  for all
  to anon, authenticated
  using (false)
  with check (false);

comment on table public.email_suppressions is
  'Adresy, na ktoré sa nesmie posielať: odtlačok SHA-256, dôvod, rozsah. Bez adries a mien. Service role only.';
