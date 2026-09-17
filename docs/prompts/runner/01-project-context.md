# 01 — PROJECT CONTEXT · preflight

Cieľom nie je „načítať kontext". Cieľom je **overiť príkazom**, čo naozaj
existuje, skôr než sa čokoľvek naplánuje.

Ku každej položke patrí príkaz a jeho výstup. Položka bez výstupu je
`UNKNOWN`, nie `OK`.

---

## Povinné overenia

| čo | ako | zlyhanie |
|---|---|---|
| repo a vetva | `git rev-parse --abbrev-ref HEAD` | BLOCK |
| čistý strom | `git status --porcelain` | BLOCK, vypíš čo je špinavé |
| `origin/main` aktuálny | `git fetch && git rev-parse origin/main` | BLOCK |
| worktrees | `git worktree list` | zapíš, neblokuj |
| otvorené PR | `gh pr list --state open` | zapíš |
| Judge existuje | `node apps/crm/scripts/judge.mjs --help` | BLOCK |
| baseline existuje | `apps/crm/scripts/typecheck-baseline.json` | BLOCK |
| zámky | `.ai/bus/state/typecheck-loop-locks.json` | porovnaj s realitou |
| kontrakty | `.ai/bus/tasks/` | zapíš stav každého |
| ledger | `.ai/bus/ledger/` | zapíš posledný beh |
| CI workflowy | `.github/workflows/` + ich `on:` | zapíš |
| pravidlá projektu | `CLAUDE.md` a podobné | BLOCK ak chýba |
| Ruflo runtime | pozri nižšie | **nikdy nesimuluj** |

Pre-flight **ignoruje** vlastné stopy orchestrátora: `typecheck-loop-locks.json`
a `.ai/bus/ledger/`. Inak zlyhá na tom, čo sám zapísal.

---

## Ruflo Swarm — zvláštny režim

Runtime konfigurácia `flow-nexus` / `ruflo` **nie je v repozitári potvrdená.**

```
Ak sa Ruflo runtime nedá overiť príkazom:
  - NEVYMÝŠĽAJ jeho API, príkazy ani konfiguráciu
  - použi existujúci orchestrátor (tc-orchestrator.mjs)
  - alebo označ úlohu BLOCKED s dôvodom "ruflo_runtime_unverified"
```

Ruflo je v tejto architektúre **execution substrate, nie zdroj pravdy.**
Zdrojom pravdy je stav repozitára a ledger.

Známy detail: `latest` sa aktuálne rozlišuje na alfa verziu. Ak sa Ruflo použije,
verzia musí byť pripnutá a zapísaná do ledgeru.

---

## Reconciliation

Porovnaj **skutočný stav** proti **zdokumentovanému stavu**.

```
Pri rozpore má pre vykonávanie prioritu SKUTOČNÝ STAV REPOZITÁRA.
Rozpor sa zapíše ako nález, neopravuje sa ticho.
```

Dva doložené prípady, prečo toto pravidlo existuje:

- `judge.mjs` sa dostal do `main` cez PR #560 **mimo deklarovaného rozsahu**.
  Plán, ktorý ho považoval za budúcu úlohu, bol od toho momentu nepravdivý.
- Server `n8n-prod` bežal od 4. 8. a jeho účel sa dal zrekonštruovať len
  z bankového výpisu, konzoly a dvadsiatich štyroch mailov. Stav existoval,
  záznam nie.

---

## Výstup preflightu

```json
{
  "mode": "AUDIT",
  "checks": [{ "id": "", "cmd": "", "exit_code": 0, "result": "OK | BLOCK | UNKNOWN" }],
  "blocking": [],
  "unknown": [],
  "ruflo_runtime": "verified | unverified",
  "reconciliation_conflicts": []
}
```

Ak je `blocking` neprázdne, Runner končí. **Nepokračuje s náhradou.**
