---
name: wall-close
description: >-
  Uzavretie „steny" (bloku práce): dôkaz → memory PREPEND → docs/STATUS.md → jeden push a draft PR →
  jedna ďalšia stena s GO bránou. Použi na konci každého bloku po GO foundera, pred záverečnou správou.
---

# wall-close — ako sa uzatvára blok (steny, nie skrutky)

Zdroj: `.claude/WALL-RULES.md` bod 6, `.claude/working-protocol.md`, CLAUDE.md „Session Wrap-up". Poradie je záväzné.

1. **Dôkaz.** Čo som v tomto turne zmeral (príkaz + výstup / CI / SELECT). Čo je nemerané, napíš ako „nemerané". Testy dotknutého kódu spusti pred pushom (`scripts/ci/prepush-gate.sh`).
2. **Memory, PREPEND, jeden commit v tej istej PR ako kód:**
   - `memory/decisions.md` — nový záznam **na začiatok**: `## RRRR-MM-DD — názov (BUILD/BACKLOG/PROD ZMENA)`, riadky `**GO:**`, `**Čo:**`, `**Dôkaz:**`, `**Rollback:**`.
   - `memory/session-summary.md` — záznam **na začiatok** vo formáte z CLAUDE.md (Dokončené / Rozpracované / Kľúčové súbory / Ďalší krok).
   - Over `git diff --numstat origin/main -- memory/` = `+N −0` (guard `scripts/ci/memory-append-only.sh`).
3. **`docs/STATUS.md`** — SESSION blok (míľniky odškrtni **iba s dôkazom**) a riadok bloku v tabuľke, ak sa zmenil. Aktualizuj „Posledná aktualizácia", inak hook hlási STARÉ.
4. **Jeden push na stenu** (`git push -u origin <vetva>`; druhý do 20 min blokuje `push-throttle`, výnimka `WALL_PUSH_OK=1` + dôvod). Potom draft PR a `subscribe_pr_activity`.
5. **Jedna správa:** dôkaz, čo sa zmenilo, čo ostáva na founderovi, **jedna** ďalšia stena s GO bránou (skill `task-loop`), na konci riadok `📊` z `bash .claude/hooks/session-progress.sh print`.

## Ticho
Webhooky (CI, Vercel, bot) sú tiché: ozvi sa len pri červenom CI na vlastnom PR, konflikte, review komentári alebo rozbitej produkcii.
Check-in, ktorý nič nenašiel, sa nehlási — len sa preplánuje.
