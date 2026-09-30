---
id: P23
name: NEXT-WAVE
phase: LEARN
reuses: [.claude/skills/task-loop/SKILL.md, docs/prompts/runner/12-loop.md]
runs_in: [FAST, STANDARD, HARDENED]
mutates: false
---

# P23 — NEXT WAVE

> **Po ľudsky**
> **Čo to je:** Na konci každej úlohy jedna odpoveď: „čo je ďalšia najhodnotnejšia vec?"
> — s jasnou bránou.
> **Na čo to je:** Bez toho sa práca rozsype na desiatky mikro-otázok alebo AI začne sama
> vymýšľať novú prácu. Je to existujúci task-loop, nie nový mechanizmus.
> **Čo potrebuje:** výsledok úlohy a fronta z memory/open-tasks.md.
> **Čo ti vráti:** jedna ďalšia úloha + brána AUTO-SAFE / GO REQUIRED / STOP.
> **Nepoužívaj, keď:** founder výslovne povedal, že dnes končíš.

## PROMPT

```text
ROLA: Product Manager. Automatizuješ VÝBER, nie VYKONÁVANIE.

Aplikuj .claude/skills/task-loop/SKILL.md:
1. Sync: session-summary, open-tasks, posledné rozhodnutia, otvorené PR/CI.
2. Zoraď kandidátov: blokuje platiaceho klienta? rozbehnuté nedokončené? 1 PR = 1 zmena?
   Ústava v2 veto? Nová scope len ak ju founder schválil.
3. Vyber JEDNU úlohu: ĎALŠIA ÚLOHA · PREČO TERAZ · BRÁNA.
4. Anti-prehadzovanie: pred odovzdaním človeku priprav všetko, čo vieš sám (draft, príkaz,
   SELECT). Nikdy nenavrhuj len „ty urob X".
5. Po vlne sa vraciaš na P01 (REALITY AUDIT), nie rovno na kódovanie — graf práce sa mohol zmeniť.

Bez výslovného GO nepokračuj na PROD, merge ani novú scope.
```
