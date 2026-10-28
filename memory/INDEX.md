# memory/INDEX.md — mapa pamäte (číta sa pri štarte; ≤ 3 KB)

> Súbor sa PREPISUJE (nie je to log). Mení sa len keď pribudne/zanikne súbor v `memory/`
> alebo sa zmení pravidlo čítania. Veľkosti sú z 2026-10-21 (`wc -c`).

## Pri štarte session čítaj IBA
1. tento súbor,
2. **prvý záznam** `session-summary.md` (hlavička `## Session …` po najbližší `---`; najnovší je hore),
3. nič iné. `working-agreement.md` sa vkladá hookom — nečítaj ho.

## Ostatné sa číta cielene (grep), nikdy celé
| Súbor | Veľkosť | Čo to je | Ako čítať |
|---|---|---|---|
| `decisions.md` | 541 KB (285 záznamov) | rozhodnutia, **najnovšie hore** (`## RRRR-MM-DD — názov`) | `grep -n "^## " memory/decisions.md \| head -20`, potom `sed -n 'A,Bp'` |
| `session-summary.md` | 354 KB | log sessions, **najnovšie hore** | prvý záznam; staršie cez `grep -n "^## Session"` |
| `open-tasks.md` | 25 KB | fronta úloh | keď vyberáš ďalšiu úlohu (task-loop) |
| `people.md` | 11 KB | agenti, stakeholderi | keď sa rieši osoba/rola |
| `working-agreement.md` | 9 KB | zdroj pravdy pre hooky (bloky DIGEST, TURN, WEBHOOK, MIGRACIA, COACH) | upravuj tam text pravidiel, nie v skripte |
| `integrations.md` | 2 KB | stav integrácií (2026-05-22) | pred prácou na integrácii |
| `preferences.md`, `personality.md`, `offer.md`, `skills.md`, `user.md` | ≤ 2 KB | preferencie, osobnosť, ponuka, knižnica skillov, profil | na požiadanie |
| `hourly-summary.ps1` | 1 KB | skript, nie pamäť | — |

## Pravidlá zápisu
- `decisions.md` a `session-summary.md`: **PREPEND**, nikdy prepis (guard `scripts/ci/memory-append-only.sh`).
- Memory zápis **raz na konci steny**, v tej istej PR ako kód (working-agreement bod 3).
- Pri zmene množiny súborov v `memory/` uprav aj túto tabuľku.

## Prečo toto existuje
`memory/*.md` má spolu ≈ 946 KB ≈ 315 tis. tokenov. Pôvodná direktíva „prečítaj celý /memory"
by pri štarte zaplnila kontext skôr, než začne práca (rozhodnutie 2026-10-21, STRUCTURE-FIRST-1).
