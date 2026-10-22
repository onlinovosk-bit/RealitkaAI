---
name: merge-gate
description: >-
  Postup merge PR-iek na founderovo „merguj N" / „merguj blok X": kontrola CI na aktuálnom
  heade, merge s expectedHeadSha, riešenie konfliktu v memory/STATUS, overenie obsahu na main.
  Použi pri každom merge; NIE pri bežnom commite.
---

# merge-gate — merge iba na zelené CI, s dôkazom

Zdroj pravidiel: CLAUDE.md direktíva 8, `memory/working-agreement.md` bod 4. Výstup: **jedna správa**.

## 1. Pred mergom (read-only, minimálny výstup)
1. `mcp__github__pull_request_read` `method: get` → `head.sha`, `mergeable_state`, `draft`.
2. `method: get_check_runs` → všetky na **tomto** `head.sha` musia byť `success` (`skipped` je OK, `pending` = ešte nie).
3. Červené alebo pending CI → nemerguj. Červené: oprav príčinu na vlastnom PR; cudzie PR iba nahlás.
4. Merge iba na výslovné GO („merguj N" / „merguj blok X"). Pri „blok X": všetky ZELENÉ PR toho bloku v poradí závislostí.

## 2. Merge
`mcp__github__merge_pull_request` s `expectedHeadSha` = `head.sha` z kroku 1 (inak by sa zmergovalo niečo, čo CI nevidelo).
`merge_method` podľa konvencie repa (`squash`, ak PR nepovie inak).

## 3. Konflikt (`mergeable_state: dirty`)
- `git fetch origin main && git merge origin/main` do **vetvy PR** (nikdy rebase/force-push cudzej vetvy).
- `memory/decisions.md`, `memory/session-summary.md`: **zachovaj obe strany**, over `git diff --numstat origin/main -- memory/` = `+N −0`.
- `docs/STATUS.md` tabuľka blokov: po merge musí byť každý riadok **raz** (duplicity po cudzom merge sú známy vzor); SESSION blok je ten z tvojej vetvy.
- Push: `WALL_PUSH_OK=1 git push …` a v správe uveď dôvod (oprava konfliktu). Hook `push-throttle` inak blokuje 2. push do 20 min.

## 4. Po merge
- Over obsah na `main` (`git fetch origin main`, `git show origin/main:<súbor>` alebo `git diff --stat`) — nie „GitHub povedal merged".
- Správa: PR čísla, `head.sha`, čo je na `main` (dôkaz), riadok `📊`. Webhooky o Vercel/CI po merge **neokomentuj**.

## Čo nerobiť
- Netvrď „zelené" z pamäte; CI čítaj v tomto turne.
- Žiadny merge na PROD flag/migráciu bez samostatného GO (viď skill `prod-migration`).
