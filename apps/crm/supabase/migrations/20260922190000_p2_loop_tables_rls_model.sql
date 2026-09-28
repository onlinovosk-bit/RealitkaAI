-- P-2: RLS model pre slučkové tabuľky.
--
-- ROZHODNUTIE FOUNDERA (2026-09-22): nie je to jedno rozhodnutie, ale päť.
-- Otázka „kto vidí slučku" hádže do jedného vreca infraštruktúrne tabuľky
-- a tenantné obchodné záznamy. Schéma sama napovedá, kam ktorá patrí.
--
--   INFRAŠTRUKTÚRA → deny-all (RLS ON, 0 policies)
--     ai_jobs                  — nemá žiadny tenantný kľúč
--     lead_triage_idempotency  — má len lead_id
--     Prístup výhradne cez service_role, ktorý RLS obchádza
--     (rolbypassrls = true). Absencia tenantného kľúča je dôkaz, že ide
--     o internú mechaniku, nie o dáta nájomcu.
--
--   TENANTNÉ → izolácia cez agency_id
--     credit_ledger            — vlastné peniaze nájomcu
--     decisions                — rozhodnutia nad jeho leadmi
--     exclusivity_outcomes     — výsledky nad jeho leadmi
--     Všetky tri majú agency_id, takže netreba žiadny nový stĺpec.
--
-- PREČO DROP + CREATE A NIE LEN CREATE:
--   Repo a PROD sa v policy rozchádzajú. credit_ledger má tenantné policy
--   už od 20260613000000, ale tá migrácia v PROD nikdy nebežala (PROD má na
--   všetkých troch tabuľkách 0 policies). Keby sa tu len pridávalo, CI by
--   skončilo s dvoma sadami a PROD s jednou.
--   DROP + CREATE s najvyšším timestampom konverguje na jeden známy tvar
--   bez ohľadu na to, či sa staršie migrácie nasadia pred ňou alebo po nej.
--
-- ROZSAH: UPDATE a DELETE zámerne bez tenantnej policy — rovnako ako
--   v 20260613000000. Tie patria service_role a RPC funkciám.

-- ── infraštruktúra: zámerné deny-all ─────────────────────────────────────────

alter table public.ai_jobs enable row level security;

comment on table public.ai_jobs is
  'intentional infra deny-all: RLS ON, 0 policies. Interna pracovna fronta bez tenantneho kluca. Pristup len cez service_role (rolbypassrls). Nepridavat policy bez rozhodnutia vlastnika (P-2).';

-- lead_triage_idempotency nie je v active migration sete (existuje len v PROD),
-- takže komentár musí byť guardovaný na existenciu tabuľky.
do $$ begin
  if to_regclass('public.lead_triage_idempotency') is not null then
    execute 'alter table public.lead_triage_idempotency enable row level security';
    execute $c$comment on table public.lead_triage_idempotency is
      'intentional infra deny-all: RLS ON, 0 policies. Interny dedup bez tenantneho kluca (len lead_id). Pristup len cez service_role (rolbypassrls). Nepridavat policy bez rozhodnutia vlastnika (P-2).'$c$;
  end if;
end $$;

-- ── tenantné: izolácia cez agency_id ─────────────────────────────────────────

alter table public.credit_ledger        enable row level security;
alter table public.decisions            enable row level security;
alter table public.exclusivity_outcomes enable row level security;

-- credit_ledger
drop policy if exists credit_ledger_tenant_select on public.credit_ledger;
create policy credit_ledger_tenant_select
  on public.credit_ledger
  for select
  to authenticated
  using (agency_id in (select public.profile_agencies_for_auth()));

drop policy if exists credit_ledger_tenant_insert on public.credit_ledger;
create policy credit_ledger_tenant_insert
  on public.credit_ledger
  for insert
  to authenticated
  with check (agency_id in (select public.profile_agencies_for_auth()));

-- decisions
drop policy if exists decisions_tenant_select on public.decisions;
create policy decisions_tenant_select
  on public.decisions
  for select
  to authenticated
  using (agency_id in (select public.profile_agencies_for_auth()));

drop policy if exists decisions_tenant_insert on public.decisions;
create policy decisions_tenant_insert
  on public.decisions
  for insert
  to authenticated
  with check (agency_id in (select public.profile_agencies_for_auth()));

-- exclusivity_outcomes
drop policy if exists exclusivity_outcomes_tenant_select on public.exclusivity_outcomes;
create policy exclusivity_outcomes_tenant_select
  on public.exclusivity_outcomes
  for select
  to authenticated
  using (agency_id in (select public.profile_agencies_for_auth()));

drop policy if exists exclusivity_outcomes_tenant_insert on public.exclusivity_outcomes;
create policy exclusivity_outcomes_tenant_insert
  on public.exclusivity_outcomes
  for insert
  to authenticated
  with check (agency_id in (select public.profile_agencies_for_auth()));
