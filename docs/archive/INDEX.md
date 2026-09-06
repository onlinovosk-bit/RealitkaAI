# Docs archive — INDEX

**Prečo tento priečinok existuje:** `docs/` root má zostať bez veľkých (>50 kB) prompt súborov. Historické master prompt-y, agent štandard a session log sú referenčné, nie denný vstupný bod. Presun `git mv` zachováva históriu.

**Swarm:** REV-N1 · `rev/n1-docs-hygiene` · noc 26.→27. 8. 2026  
**Predošlá vlna:** Brief 10 Wave C3 (2026-06-25) presunula len `MASTER_PROMPT.md`; V3 / AGENT_STANDARD / progress ostali v roote kvôli grep referenciám. REV-N1 dokončuje C3.

## Inventár

| Archívna cesta | Pôvod | Veľkosť (pri presune) | Dôvod |
|----------------|-------|------------------------|-------|
| `prompts/MASTER_PROMPT.md` | `docs/MASTER_PROMPT.md` | — | Brief 10 C3. Legacy L99 multi-agent OS; nahradené V3. |
| `prompts/MASTER_PROMPT_V3.md` | `docs/MASTER_PROMPT_V3.md` | ~157 kB | REV-N1. L99 Agent OS v3.0 (2026-05-06) — presahuje 50 kB limit docs rootu. |
| `AGENT_STANDARD.md` | `docs/AGENT_STANDARD.md` | ~8 kB | REV-N1. Prompting štandard; nie denný runbook. |
| `progress.md` | `docs/progress.md` | ~13 kB | REV-N1. Session log naposledy aktualizovaný 2026-05-04; kanonický progress je v `apps/crm/docs/`. |

## Živé odkazy, ktoré N1 nestránil (mimo scope ciest)

Tieto súbory stále ukazujú na staré cesty v `docs/` root. Oprava = samostatný PR (N1 nesmie siahnuť mimo enumerované cesty):

- `docs/AUTOMERGE-POLICY.md` → `[AGENT_STANDARD.md](./AGENT_STANDARD.md)`
- `docs/ARCHIVE-PROPOSAL.md`, `docs/briefs/README.md` — inventár ešte hovorí KEEP / C3 čiastočne
- `apps/crm/tasks/todo.md`, `apps/crm/tasks/lessons.md` — zmienky `MASTER_PROMPT_V3.md`

## Presuny, ktoré sa neurobili (súbory nikdy neboli v `overnight/`)

Overené `git log --all --full-history` na `docs/briefs/overnight/cursor-brief-demo-page-final*` a `recruiting-modul-brief*`: **žiadny commit**. Rovnaký záver ako Brief 9 Agent H / Brief 10 C2.

| Očakávaný zdroj | Stav |
|-----------------|------|
| `docs/briefs/overnight/cursor-brief-demo-page-final*` | neexistuje v histórii — `git mv` nie je možný |
| `docs/briefs/overnight/recruiting-modul-brief*` | neexistuje v `overnight/` — živá kópia je mimo N1 scope: `apps/crm/docs/strategy/recruiting-modul-brief-2026-06-03.md` |

`docs/prompts/` ostáva cieľom týchto presunov, ak sa súbory niekedy objavia; N1 do `docs/prompts/` nič nové nevytvára (REV-N3 tam píše `outreach/**`).

## Brief 6

`docs/briefs/overnight/overnight-master-brief-6.md` — pôvodný master brief nebol commitnutý. REV-N1 nahradil Brief 10 C1 placeholder rekonštrukciou hlavičky z git logu okolo Brief 5 (2026-06-10) a Brief 7 (2026-06-15) + closeout `OVERNIGHT-REPORT-6` (`ca76331a2`, 2026-06-11). Telo označené `[REKONŠTRUKCIA — overiť]`.
