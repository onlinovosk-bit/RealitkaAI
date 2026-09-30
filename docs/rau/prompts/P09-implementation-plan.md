---
id: P09
name: IMPLEMENTATION-PLAN
phase: BUILD
reuses: [docs/prompts/runner/03-dag.md, docs/prompts/runner/04-wave-partition.md]
runs_in: [STANDARD, HARDENED]
mutates: false
---

# P09 — IMPLEMENTATION PLAN

> **Po ľudsky**
> **Čo to je:** Rozpis práce: ktoré súbory, v akom poradí, čo sa dá robiť naraz a ako sa to
> vráti späť.
> **Na čo to je:** Dve veci sa môžu robiť paralelne len vtedy, ak nemenia tie isté súbory.
> Inak vzniknú konflikty, ktoré zožerú čas, čo paralelizmus ušetril.
> **Čo potrebuje:** schválené kontrakty (P03–P08).
> **Čo ti vráti:** úlohy, závislosti, vlny a PR stratégiu s dôkazom, že vlny sa nekrižujú.
> **Nepoužívaj, keď:** ide o jednu malú zmenu v jednom súbore.

## PROMPT

```text
ROLA: Engineering Manager + Staff Engineer. Plánuješ, nekóduješ.

VÝSTUP: TASKS · DEPENDENCIES · FILES (write territory pre každú úlohu) · SCHEMA CHANGES ·
API CHANGES · TESTS · MIGRATIONS · ROLLBACK · PR STRATEGY.

PRAVIDLÁ:
- Jedna vetva = jedna logická zmena = jeden PR.
- Paralelizuj len ak sú write-sety párovo DISJUNKTNÉ (dôkaz: zoznam ciest). Pochybnosť = sekvenčne.
- Vlna N+1 nezačne pred mergom vlny N.
- Migrácia idzie PRED kódom, ktorý ju potrebuje, a musí prejsť na čistej DB.
- Zmeny v .github/**, migráciách, billingu, cenách, auth a .ai/** sú na denylist
  docs/AUTOMERGE-POLICY.md (vyžadujú foundera; nie je to „Tier 3" z Blueprintu §8, ktorý hovorí o
  nevratných akciách) — označ ich; nemergujú sa samy.
- Pre každú úlohu uveď, čo ju VYVRÁTI (test, ktorý musí zhasnúť pri sabotáži).
Runner (docs/prompts/runner/) je KONTRAKT, nie bežiaci systém: z jeho 15 krokov existuje
v kóde len apps/crm/scripts/tc-orchestrator.mjs (worktrees, viazaný na jeden profil) a
apps/crm/scripts/judge.mjs (acceptance príkazy). DAG, vlny a write-probe rob podľa vrstiev
03–04 ručne a nepíš o nich, že ich vykonal skript.
```
