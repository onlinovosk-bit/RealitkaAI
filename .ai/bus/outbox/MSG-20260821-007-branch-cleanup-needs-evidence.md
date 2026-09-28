---
id: MSG-20260821-007-branch-cleanup-needs-evidence
type: decision
from: founder
to: cursor
created: 2026-08-21
status: accepted
owner: cursor-agent
re: MSG-20260821-003-result-branch-inventory
next_action:
  gate: NEEDS-EVIDENCE
  summary: >-
    Withdraw mass-delete GO. Build full evidence pack (full clone, all tip
    SHAs, backup refs, full cherry, edge policy) before any delete GO.
---

# Branch cleanup — NEEDS-EVIDENCE (GO withdrawn)

## Verdikt

Most / kontrolór: **NEEDS-EVIDENCE**. Founder **stiahol GO** na zmazanie ~208
vetiev. Predchádzajúca „metóda obstála, GO“ na základe 4/208 (~2 %) vzorky
**neplatí**.

## Prečo (prijaté body)

1. **Vzorka:** 4 z 208 nestačí na nezvratné delete. Falošné READY z plytkého
   klonu = dôvod overiť všetkých 208, nie uspokojiť sa.
2. **Shallow trap:** nikto nepotvrdil, že Cursorova pôvodná analýza bežala na
   plnej histórii. Ak bežala shallow, celý zoznam kandidátov je podozrivý.
3. **Tip SHA:** nie len obnova — aj detekcia, či vetva medzi analýzou a delete
   neposkočila (push od kohokoľvek).
4. **Backup refs:** pred delete pushnúť `refs/cleanup/2026-08-21/<branch>` na
   origin → delete je triviálne vratné jedným príkazom.

## Zadanie pre Cursor (TASK-0003)

Vykonaj **evidence pack**, nie delete:

| # | Krok | Dôkaz |
|---|------|-------|
| 1 | Full clone | `git rev-parse --is-shallow-repository` → `false` |
| 2 | Tip SHA všetkých kandidátov | tabuľka branch → SHA v reporte |
| 3 | Backup refs (po GO na push refs) | `refs/cleanup/2026-08-21/<branch>` |
| 4 | Full-set cherry / ancestry vs `origin/main` | výstup pre N=N |
| 5 | Edge-case policy | closed-unmerged PR, tags, protected, open PR, tip drift |

Až potom samostatné **GO na delete**.

## Procesná poznámka

Presne toto má most robiť: ostrá otázka zabránila nezvratnej operácii na
slabej vzorke.

## Mimo scope tohto MSG

Smolko Gmail dual-run (kód #422 na main) — samostatná P0 linka; neblokovať ju
týmto evidence packom.
