---
id: TASK-NS-001
type: task
status: IN_PROGRESS
owner: cursor-north-star
created_at: 2026-09-15T20:55:00Z
trace_id: TRACE-2026-09-15-NS-001
parent_task_id: null
context_refs:
  - docs/overnight/2026-09-17-north-star-measurement-loop/START-HERE.md
memory_refs: []
constraints:
  - measurement scope only
  - no production writes
approval_required: false
idempotency_key: TASK-NS-001-north-star-w2-backfill
deadline: 2026-09-16T08:00:00+02:00
required_capabilities:
  - node
  - git

scope:
  repo_paths:
    - .ai/bus/metrics/**
    - .ai/bus/ledger/**
    - scripts/sql/north-star-day.sql
    - apps/crm/scripts/north-star-validate.mjs
    - docs/reports/**
    - output/overnight/**
    - .ai/bus/tasks/TASK-NS-001.md
  forbidden_paths:
    - apps/crm/src/**
    - apps/crm/supabase/migrations/**
    - apps/crm/vercel.json
    - apps/crm/next.config.js
    - .env*

acceptance:
  - id: N1
    desc: "kazdy den ma prave jeden riadok"
    cmd: "node apps/crm/scripts/north-star-validate.mjs --range 2026-08-17,2026-09-16 --ci"
    expect: exit_code == 0
  - id: N2
    desc: "typova chyba nepribudla"
    cmd: "node apps/crm/scripts/typecheck-baseline.mjs"
    expect: exit_code == 0
  - id: N3
    desc: "diff nevysiel zo scope"
    cmd: "git diff --name-only origin/main...HEAD"
    expect: all_paths_in(scope.repo_paths)

budget:
  max_iterations: 4
  max_cost_usd: 3
  max_runtime_minutes: 60

risk: low

evidence:
  commands: []
  files: []

verdict:
  result: null
  reason: null
  checked_at: null
  ledger_run_id: null
---

# TASK-NS-001 — North-star W2 backfill

Append-only metrics for 31 days + W2 report. No production code changes.

## FINDING 2026-09-17 — karta a ledger si odporuju (neopravene zamerne)

**FINDING-1 (verdikt):** Front matter drzi `verdict.result: null` a `status: IN_PROGRESS`,
hoci Judge uz nad touto kartou vydal `ACCEPT`.

EVIDENCE:
```
grep -n "TASK-NS-001" .ai/bus/ledger/2026-09.jsonl
2: RUN-20260915184947-TASK-NS-001  iterations 1  verdict ACCEPT  "3 kontrol PASS, risk=low"
3: RUN-20260915185203-TASK-NS-001  iterations 2  verdict ACCEPT  "3 kontrol PASS, risk=low"
   finished_at 2026-09-15T18:52:14.940Z
   acceptance: N1 exit 0 pass, N2 exit 0 pass, N3 exit null pass
```
Cesta v karte: `.ai/bus/tasks/TASK-NS-001.md:` blok `verdict` (`result: null`,
`reason: null`, `checked_at: null`, `ledger_run_id: null`).

**Preco to NIE JE opravene tu:** `docs/prompts/multi-agent-protocol-v0/06-operating-mode-b.md`,
sekcia "Pravidla pridane z behov 16. az 17. 9.": *"Verdikt zapisuje iba Judge.
Rucne `verdict.result` = porusenie."* Rucne doplnenie `ACCEPT` do front matteru by bolo
to iste porusenie, aj keby sa hodnota trafila. Ledger je append-only zaznam behov a
zostava nedotknuty (`02-claim-evidence.md`, pravidlo 5).

**FINDING-2 (prazdna evidence):** Karta ma `evidence.commands: []` a `evidence.files: []`,
hoci beh `RUN-20260915185203-TASK-NS-001` zaznamenal tri konkretne prikazy s exit kodmi.
Podla STATE MUST BE EVIDENCE-BACKED (`06-operating-mode-b.md`) je `status` bez `evidence`
iba tvrdenie. Stav po vrstvach: ledger = **ACCEPT**, karta = **unknown**, produkcia =
**unknown** (ziaden deploy dokaz v repe; task ma `constraints: no production writes`).

**PROPOSAL — co tento rozpor zavrie (gate: GO REQUIRED, founder):**

1. Judge musi bezat znova nad kartou, nie sa prepisat rucne. Blok `verdict` uz je prazdny
   (`result: null`), takze Judge sa na nom nezastavi — `apps/crm/scripts/judge.mjs:~82`
   blokuje iba predvyplneny verdikt.
2. Reopen postup (po founderovom GO, na vetve, nie na `main`):
   ```
   npm --prefix apps/crm ci                     # judge.mjs importuje js-yaml
   node apps/crm/scripts/judge.mjs --task .ai/bus/tasks/TASK-NS-001.md --base origin/main
   # dry-run: exit 0 ACCEPT / 1 REJECT / 2 BLOCKED / 3 HUMAN, ledger sa zapise
   node apps/crm/scripts/judge.mjs --task .ai/bus/tasks/TASK-NS-001.md --write-verdict
   # az toto zapise verdict blok do karty (judge.mjs:207 patchContract())
   ```
3. Az potom smie `status` prejst na `done` a `evidence.commands` prebrat prikazy z behu.
   Kym Judge nebezal, karta ostava `IN_PROGRESS` — to je poctivy stav, nie chyba.
4. Pozor na rozpocet: `budget.max_iterations: 4`, ledger uz eviduje `iterations: 2`.
   Dalsi beh je 3. Ak by Judge vratil HUMAN pre vycerpany rozpocet, plati ta ista
   cesta ako pri `TASK-TC-BATCH-1` — podpis foundera v `founder_approval`, nie prepis verdiktu.

Tento zaznam je FINDING + PROPOSAL podla `02-claim-evidence.md`. Nie je to DECISION.
