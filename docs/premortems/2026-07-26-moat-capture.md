# PREMORTEM: Moat Capture vrstva (deal_outcomes + ai_recommendations)

**Cieľová cesta:** `docs/premortems/2026-07-26-moat-capture.md`
**Zdroj (Build Package):** `docs/briefs/overnight/overnight-brief-moat-capture.md`
**Podľa šablóny:** `docs/templates/premortem.md` (extrakcia PREMORTEM sekcií z briefu)

## KROK 3 — Imaginácia zlyhania
Je **26.08.2026**. Capture vrstva zlyhala, pretože riziká nižšie sa
materializovali bez dostatočnej mitigácie v pláne.

## KROK 5 — Matica P×Z (základ + Build Package kategórie)

| # | Riziko | P | Z | Sk | Mitigácia / Kill |
|---|---|---|---|---|---|
| 1 | Log insert padal a zhadzoval triage — leady sa prestali spracúvať | 2 | 3 | 6 | fire-and-forget try/catch + test "helper never throws"; Kill: error v triage flow → hotfix okamžite |
| 2 | Makléri klikali "iné/asdf" — dáta na učenie bezcenné | 3 | 2 | 6 | reason_code číselník povinný, text voliteľný; check-in: audit rozloženia kódov po 30 d (brain advisory) |
| 3 | NBA render logoval pri každom refreshi — tabuľka za mesiac 100k riadkov šumu | 2 | 3 | 6 | dedupe_key + unique index; acceptance test 2×render=1 riadok |
| 4 | Migrácia po kóde — repete incidentu 22.07 | 1 | 3 | 3 | atomicity checklist v PR, founder spúšťa migráciu |
| 5 | RLS diera — agentúra videla cudzie outcomes | 1 | 3 | 3 | RLS testy v acceptance |
| 6 | Nikto nevedel, že polia treba vyplňať — Smolko ich preskakoval | 2 | 3 | 6 | modal povinný (nedá sa preskočiť) + 1 veta Smolkovi v najbližšom kontakte; check-in 30 d |
| 7 | MULTI-TENANT: dedupe_key kolidoval medzi agentúrami → tichá strata logov | 1 | 3 | 3 | dedupe_key prefixovaný agency_id v helperi + test |
| 8 | ROLLBACK: revert kódu nechal UI modal bez backendu → won/lost nešlo uložiť | 1 | 3 | 3 | modal a helper v jednom PR; revert = celý PR, test won flow po reverte |
| 9 | MEMORY: outcome pole ostalo navždy null → "capture" bez outcome nemá učiacu hodnotu | 3 | 2 | 6 | outcome_at review job je súčasť LEARN fázy — zapísané do decisions ako známy dlh s review +90 d, NIE tichý predpoklad |

## Poznámka k bráne
Riziká so skóre **≥6** (#1, #2, #3, #6, #9) vyžadujú mitigáciu v implementačnom
PR pred founder GO na PROD migráciu (workflow.mdc + Build Package checklist).
