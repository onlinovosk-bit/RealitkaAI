# 06 — Operating mode B: jeden executor + subagenti

**Cieľová cesta:** `docs/prompts/multi-agent-protocol-v0/06-operating-mode-b.md`
**Autorita:** `DEC-20260917-002-operating-mode-b` (founder GO, 2026-09-17)
**Vzťah k 00–05:** 00–05 platia ďalej. Tento súbor mení **kto** vykonáva a **kade** tečie práca, nie pravidlá typovania ani ľudskú bránu.

## Prečo

Na behoch z 16. až 17. 9. vznikol prenos cez foundera takmer výhradne na hranách medzi nástrojmi
(ChatGPT ↔ Claude ↔ Cursor): 6 patchov, duplicitný Track B, stav na audit vetve a nie na `main`,
dva prepisy Acceptance. Gate 0 validácia bežala v jednej session so subagentmi a founder nemusel nič prenášať.

## Roly

| rola | kto | smie | nesmie |
|---|---|---|---|
| `founder` | Andy | DECISION, merge, GO | — |
| `executor` | **Claude Cowork (cloud) session** so zápisom do repa | handoff, subagenti, feature vetvy, PR proti `main` | merge, push do `main`, prod zápis, vlastné DECISION |
| `reviewer` | subagenti spustení executorom (rola executor / challenger) | FINDING, PROPOSAL, EVIDENCE podľa 00, 02, 04 | DECISION, ACTION mimo vlastného výstupu |
| `advisor` | ChatGPT, Grok (voliteľne) | názor v chate | vstupovať do repa alebo handoffu priamo |

**Jeden zapisovateľ na task.** Cursor na úlohe, ktorú vykonáva executor B, súbežne nepracuje.

## Tok práce

1. Task karta na `main` (`.ai/bus/tasks/`).
2. Executor napíše handoff (01) a spustí **≥2 nezávislých subagentov v izolovaných worktrees**, bez obsahu tasku v prompte (04).
3. Executor overí výstupy validačnými pravidlami (typ, dôkaz, rola, `context_requests: []`), zopakuje kľúčové dôkazy a syntetizuje.
4. Zmena ide ako **feature vetva → PR proti `main`**. Dlhodobé audit vetvy ako nositeľ stavu sa nepoužívajú.
5. Founder rozhodne jednou vetou alebo merge. Executor vetu prepíše doslovne do DECISION (03).
6. Advisor vstupuje len cez founderovu vetu, nikdy ako ďalší handoff.

## Pravidlá pridané z behov 16. až 17. 9.

- **STATE MUST BE EVIDENCE-BACKED:** `status` bez `evidence` pre každú vrstvu (PR / commit / produkcia) je iba tvrdenie. Neoverená vrstva má hodnotu `unknown`.
- **DECISION nesmie meniť Acceptance**, iba ju vyhodnotiť. Meranie, ktoré nesedí so scope, dostane stav `fail` a `deviation: pending_founder_decision`, nie iný výklad.
- **Verdikt zapisuje iba Judge.** Ručné `verdict.result` = porušenie.

## Pozastavené / vypnuté týmto režimom

| čo | stav | návrat |
|---|---|---|
| Land `tc-orchestrator` (ručné Cursor okná s PROMPT.md) | **pozastavené**; patche pripravené, nelandované | founder GO |
| Nočná vlna `trig_01LnCAgnpBZQK46Lth1mDLhV` | **vypnutá** 2026-09-17 | zapnúť, keď executor/runner má zápis do repa a na `main` je skutočne otvorený kontrakt |
| Handoffy cez chat medzi nástrojmi | **zrušené** | — |

## Predpoklad a degradovaný režim

Predpoklad: `onlinovosk-bit/RealitkaAI` je medzi authorized sources executorovej session.
Kým to neplatí, executor doručuje patche. **Každý taký prenos sa počíta do metriky.**

## Metrika a revízia

- `founder_relays` na task = počet prípadov, keď founder preniesol súbor, príkaz alebo kontext medzi nástrojmi (bez vlastného rozhodnutia a merge).
- **Cieľ: 0.** Zapisuje sa do výsledku tasku.
- **Revízia po 5 taskoch:** founder rozhodne, či režim B ponechať, upraviť, alebo prejsť na GitHub-native variant (Claude + Codex v PR).
