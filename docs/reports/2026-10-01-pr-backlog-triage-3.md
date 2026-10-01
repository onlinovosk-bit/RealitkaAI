# Triáž PR backlogu #3 (PR-BACKLOG-TRIAGE-3)

**Dátum:** 2026-10-01 · **Brána:** `GO PR-BACKLOG-TRIAGE-3` · **Referenčný `main`:** `e1340c1d`
**Rozsah:** iba meranie (`merge-tree` proti `origin/main`, čítanie `origin/main`). Nič nezmergované ani zatvorené.

## Čo sa od triáže #2 zmenilo
Otvorených je **14** (bolo 25). Zatvorené (founder): #495, #443, #304, #393, #326, #155, #360–#365. Zmergované: #775.

## ⚠ Najdôležitejšie: opravy zo zatvorených PR **nie sú na `main`**
#443, #495 a #304 boli zatvorené ako „prenesené", ale prenos žije **iba v drafte #776** (nezmergovaný). Overené na `origin/main`:

| Oprava | Stav na `main` |
|---|---|
| #495 — BRI skóre | `process-lead.ts:95` stále `bri?.new_score ?? 50` |
| #304 — reset hesla `?code=` | `getRecoveryCodeCallbackPath` na `main` neexistuje |
| #443 — scoped klient | `createProperty(…, scopedSupabase)` na `main` neexistuje |

Ak sa #776 zavrie bez mergu, všetky tri chyby sú späť a **nič ich už nesleduje**. Merge #776 (alebo vyrezanie blokov 3–5 do vlastného PR) je podmienka toho, aby zatvorenie bolo pravdivé.

## Zostáva 14 PR
| PR | téma | merge | verdikt |
|---|---|---|---|
| **#776** | CHECKOUT-DIAG + triáž + 3 porty + 3 ENV bloky | čistý | **čaká na founderov merge** (CI zelené) |
| **#774** | MAILBOX-LOG-FIX + DOMAIN-LOG-DURABLE | čistý | obsahuje **migráciu** `20261001100000_inbound_mail_outcomes.sql` — migrácie sa lokálne neoverili; merge až po overení na Postgrese |
| **#779** | OUTREACH-DOMAIN-PROOF záznam | čistý | iba `memory/`; v poriadku |
| #433, #426, #366, #351 | docs/reporty z augusta | čisté, docs-only | nízka hodnota; zmergovať alebo zatvoriť podľa toho, či ich chceš v repe |
| #357 | `.cursor` rule (1 súbor) | čistý | nízka hodnota; rozhodnutie podľa toho, či Cursor ešte používaš |
| **#358** | dead-export check + baseline | čistý, ale 429 commitov za `main` | **nemergovať**: `dead-exports-baseline.json` je snímka z augusta a sahá na `program-tier-pricing.ts` (horúci súbor). Zastaraná baseline buď zhodí CI, alebo ticho nič nehlási — presne vzor, na ktorý upozorňujú `judge.mjs`/`tc-orchestrator.mjs`. Zavrieť, prípadne nová brána |
| #198 | DFY order bump | **konflikt** (aj `checkout-config/route.ts`) | `MIGRATION_DFY` na `main` nie je; platí sa až po CHECKOUT-ENV-01 → **BACKLOG** |
| #192 | notifications inbox | **konflikt** (`WorkdeskTopbar.tsx`) | na `main` nie je; 776 commitov za → BACKLOG alebo prepísať |
| #191 | founder metrics export | **konflikt** | `metrics/export` na `main` nie je; **VALIDATE** (zaplatí to niekto?) |
| #189 | onboarding wizard | **konflikt** | `get-started` na `main` nie je; flag OFF → BACKLOG |
| #186 | nehnutelnosti.sk import | **konflikt** | parser na `main` nie je; **GDPR gate** pred akýmkoľvek mergom |

Pozn.: „776 commitov za `main`" znamená, že PR vznikli v júni; merge-tree ukazuje konflikt aj tam, kde ho `git diff` neukazuje, takže ich nemergovať naslepo.

## Odporúčanie
1. **Zmergovať #776** (alebo povedať, ktoré bloky vybrať) — inak sú zatvorené #443/#495/#304 bez opravy.
2. **#774**: neoverená migrácia → overiť na scratch Postgrese pred mergom (samostatná brána).
3. **Zavrieť:** #358. **Rozhodnúť:** #433, #426, #366, #351, #357 (docs).
4. **BACKLOG/VALIDATE:** #198, #192, #191, #189, #186 — žiadne neprejde Constitution gate bez zákazníckeho signálu; #186 navyše GDPR.
