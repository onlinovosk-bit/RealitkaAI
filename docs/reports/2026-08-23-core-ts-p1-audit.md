# core.ts × P1 audit — STOP (baseline nie je na origine)

**Lane:** B (TASK-0004 replay, executed 2026-08-25)  
**Typ:** read-only. Žiadna zmena `scripts/`.  
**BASE_SHA:** `4316ad49820c48424b22e03bf14e9b5fbdd1ed5c` (`origin/main`)  
**Gate command:** `git ls-remote --heads origin feat/bridge-harness`  
**Výsledok:** prázdny výstup — **ref `origin/feat/bridge-harness` neexistuje.**

## Verdikt

**STOP.** Audit `scripts/ruflo-model-bridge/core.ts` sa nespustil.

Vstupná brána bod 2: ak `origin/feat/bridge-harness` neexistuje alebo neobsahuje
commit so správou `V0 Step A contracts`, Lane B **nečíta lokálnu kópiu**.
Lokálny `core.ts` v tomto clone tiež nie je (súbor na `origin/main` chýba;
grep 0). Čítať ho by bolo hádanie.

Tento report **nie je** hodnotenie P1 voči kódu. Je to dôkaz, že dôkaz chýba.

## Tabuľka (povinný tvar)

| P1 | Porušené? | Súbor:riadok | Dôkaz (citovaný úryvok) | Odhad opravy (XS/S/M) |
|---|---|---|---|---|
| P1-1 `attempt:2` | **neoverené** | — | `missing: origin/feat/bridge-harness` (ls-remote prázdne, 2026-08-25) | n/a — najprv push baseline |
| P1-2 `created → killed \| cancelled` | **neoverené** | — | rovnaké `missing` | n/a |
| P1-3 `verification_completed` verdict | **neoverené** | — | rovnaké `missing` | n/a |
| P1-4 `unknown` nie je event | **neoverené** | — | rovnaké `missing` | n/a |
| P1-5 Ruflo begin-failure | **neoverené** | — | rovnaké `missing` | n/a |

## Päť otázok (zodpovedané len ako STOP)

1. **`unknown` v union vs. `reduceWorkflowEvents`:** neoverené. Bez `core.ts` z commitu `V0 Step A contracts` sa nedá povedať, či kód produkuje `unknown` eventom.
2. **Transition `created → killed | cancelled`:** neoverené.
3. **`verification_completed` a `verdict`:** neoverené.
4. **Tvrdý zákaz `attempt:2` vs. zákaz auto-retry:** neoverené.
5. **Ruflo projection failure = kill vs. `projectionStatus=failed`:** neoverené.

## Čo founder potrebuje pred opakovaním Lane B

1. Capture PC: push `feat/bridge-harness` s commitom, ktorého správa obsahuje `V0 Step A contracts` (pozri `docs/reports/2026-08-22-agent-os-v0-implementation-stop.md`).
2. Overiť: `git ls-remote --heads origin feat/bridge-harness` vráti SHA.
3. Až potom nové GO na docs-only audit (nie `GO IMPLEMENT V0`).

**Žiadny odhad opravy kódu.** Odhad bez súboru by bol fikcia.
