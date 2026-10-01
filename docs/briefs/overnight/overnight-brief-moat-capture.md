# OVERNIGHT BRIEF: Moat Capture vrstva (deal_outcomes + ai_recommendations)

**Cieľová cesta:** `docs/briefs/overnight/overnight-brief-moat-capture.md`
**Kategória:** Core Platform (zberná vrstva moat dát — každý deň bez logu
= stratené dáta; North Star). **Noc 1 z 2** — Guardian v1 až po merge tohto.
**Premortem:** vyplnený nižšie; pri Kroku 0 ulož kópiu do
`docs/premortems/2026-07-26-moat-capture.md`.

## Cieľ
Revolis začne trvalo zapisovať (1) výsledky uzavretých obchodov s dôvodmi
a (2) každé AI odporúčanie s reakciou makléra. ŽIADNA inteligencia/учenie —
len zber. Learn vrstva ostáva za bránou 3 zákazníkov (COMPANY.md).

## Krok 0 — repo-first
Prečítaj brain/identity/*, .cursor/rules/*, tento brief. Nájdi presné
miesta: (a) kde sa mení status leadu na won/lost (handler/komponent),
(b) call-sites AI výstupov: triage on-insert (acquire route), NBA panel,
AI email generátor. Nahlás cesty v reporte — nehádaj.

## Migrácia (JEDNA, aditívna, žiadne ALTER existujúcich stĺpcov)
```sql
create table deal_outcomes (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id),
  lead_id text not null references leads(id),
  outcome text not null check (outcome in ('won','lost')),
  reason_code text not null,          -- z predvoleného číselníka
  reason_text text,                   -- voliteľné doplnenie
  negotiation_note text,
  time_to_close_days int,
  agent_id uuid,
  property_type text, location text, price numeric,
  closed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id),
  lead_id text references leads(id),
  source text not null check (source in ('triage','nba','ai_email','followup')),
  recommendation text not null,
  reasoning text,
  confidence numeric,
  status text not null default 'shown'
    check (status in ('shown','accepted','rejected','expired')),
  acted_at timestamptz,
  outcome text, outcome_at timestamptz,
  model_version text,
  dedupe_key text,                    -- idempotencia zobrazení
  created_at timestamptz not null default now()
);
create unique index ai_rec_dedupe on ai_recommendations(dedupe_key)
  where dedupe_key is not null;
create index on ai_recommendations(agency_id, created_at desc);
create index on deal_outcomes(agency_id, closed_at desc);
```
RLS: obe tabuľky per-tenant (vzor z leads/lead_consents). Reason_code
číselník (won: cena/rychlost/vztah/exkluzivita/iné · lost: cena/konkurencia
/rozmyslel_si/financovanie/nedostupny/iné) ako konštanta v kóde.

## Kód (minimálne zásahy)
1. **Deal close:** pri prechode na won/lost modal s povinným reason_code
   (select) + voliteľným textom → insert deal_outcomes. Ak modal technicky
   nejde do noci, fallback: insert s reason_code='unspecified' + TODO —
   zapíš ako ODCHÝLKU.
2. **AI log:** helper `logAiRecommendation()` — try/catch, NIKDY nesmie
   zhodiť hlavný flow (fire-and-forget). Volania: triage výsledok
   (dedupe_key = `triage:{lead_id}:{run}`), NBA render (dedupe_key =
   `nba:{lead_id}:{hash}`), NBA accept/reject → update status+acted_at,
   AI email generate → source='ai_email'.

## Nasadenie — ATOMICITA (architecture.mdc, PR checklist povinný)
(1) migrácia na PROD DB → (2) overenie schémy → (3) deploy kódu →
(4) smoke `/odhad/reality-smolko` = 200 + 1 testovací triage log.
**Migráciu na PROD spúšťa founder (GO brána) — kód sa nemerguje pred ňou.**

## Acceptance
Unit: helper nikdy nevyhodí výnimku von · dedupe funguje (2× render = 1 riadok)
· RLS test cross-tenant deny · e2e: won lead → deal_outcomes +1 ·
triage nového leadu → ai_recommendations +1 · CI + brain:check zelené ·
registrácia tabuliek v brain registry.

## PREMORTEM (je 26.08.2026, capture vrstva zlyhala, pretože...)
| # | Riziko | P | Z | Sk | Mitigácia / Kill |
|---|---|---|---|---|---|
| 1 | Log insert padal a zhadzoval triage — leady sa prestali spracúvať | 2 | 3 | 6 | fire-and-forget try/catch + test "helper never throws"; Kill: error v triage flow → hotfix okamžite |
| 2 | Makléri klikali "iné/asdf" — dáta na učenie bezcenné | 3 | 2 | 6 | reason_code číselník povinný, text voliteľný; check-in: audit rozloženia kódov po 30 d (brain advisory) |
| 3 | NBA render logoval pri každom refreshi — tabuľka za mesiac 100k riadkov šumu | 2 | 3 | 6 | dedupe_key + unique index; acceptance test 2×render=1 riadok |
| 4 | Migrácia po kóde — repete incidentu 22.07 | 1 | 3 | 3 | atomicity checklist v PR, founder spúšťa migráciu |
| 5 | RLS diera — agentúra videla cudzie outcomes | 1 | 3 | 3 | RLS testy v acceptance |
| 6 | Nikto nevedel, že polia treba vyplňať — Smolko ich preskakoval | 2 | 3 | 6 | modal povinný (nedá sa preskočiť) + 1 veta Smolkovi v najbližšom kontakte; check-in 30 d |

## ROLLBACK
Kód: revert PR (helper volania sú fire-and-forget — revert bezpečný
kedykoľvek). DB: migrácia je čisto aditívna → tabuľky sa pri rollbacku
NEDROPUJÚ (dáta sú cenné aj pri vypnutom kóde); ak treba zastaviť zápis
bez revertu: env flag CAPTURE_ENABLED=false v helperi. Poradie rollbacku:
vždy kód pred DB.

## MONITORING
Denný počet insertov do ai_recommendations per source do existujúceho
platform heartbeat logu; 0 insertov za 24 h pri živej prevádzke = advisory
(mŕtvy logger = presne júnový triage vzorec). deal_outcomes: brain:weekly
report zahrnie počet a rozloženie reason_code.

## MEMORY UPDATE (po merge)
brain/decisions: (1) "Capture-now/Learn-later stratégia moat dát" s dôvodom
a review dátumom +90 d; (2) "reason_code číselník v1" s review +30 d
(kvalita dát — premortem #2). Registrácia oboch tabuliek v brain registry.

## RELEASE CHECKLIST + DoD
☐ Founder GO na migráciu → ☐ migrácia PROD → ☐ overenie schémy →
☐ deploy → ☐ smoke (widget 200 + 1 testovací triage log v tabuľke) →
☐ CI + brain:check zelené → ☐ brain registry + decisions zapísané →
☐ 1 veta Smolkovi o povinných dôvodoch pri uzatváraní obchodu.

## PREMORTEM — doplnené kategórie (Build Package v1)
| # | Riziko | P | Z | Sk | Mitigácia |
|---|---|---|---|---|---|
| 7 | MULTI-TENANT: dedupe_key kolidoval medzi agentúrami → tichá strata logov | 1 | 3 | 3 | dedupe_key prefixovaný agency_id v helperi + test |
| 8 | ROLLBACK: revert kódu nechal UI modal bez backendu → won/lost nešlo uložiť | 1 | 3 | 3 | modal a helper v jednom PR; revert = celý PR, test won flow po reverte |
| 9 | MEMORY: outcome pole ostalo navždy null → "capture" bez outcome nemá učiacu hodnotu | 3 | 2 | 6 | outcome_at review job je súčasť LEARN fázy — zapísané do decisions ako známy dlh s review +90 d, NIE tichý predpoklad |

## Founder brány
GO na PROD migráciu · merge · znenie číselníka reason_code (návrh vyššie,
môžeš upraviť pri GO).
