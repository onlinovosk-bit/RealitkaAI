---
# Cieľová cesta: .ai/bus/tasks/TASK-TEMPLATE.md
# Task Contract v2 — rozšírenie existujúcej schémy .ai/bus/tasks/ o `acceptance` a `budget`.
# Judge tento súbor číta; vypĺňa iba blok `verdict`.

id: TASK-XXXX
type: task
status: open            # open | running | done | blocked
owner: cline-local      # kto na tom robí
created_at: 2026-09-14T00:00:00Z

scope:
  repo_paths:           # čoho sa task SMIE dotknúť (glob: * v rámci segmentu, ** cez segmenty)
    - apps/crm/src/lib/nieco.ts
    - apps/crm/src/lib/__tests__/nieco.test.ts
  forbidden_paths:      # čoho sa NESMIE dotknúť ani omylom
    - apps/crm/src/lib/infra/**
    - apps/crm/vercel.json
    - apps/crm/supabase/migrations/**

acceptance:
  # Každý riadok = jeden príkaz, ktorý sa naozaj spustí. Nie próza.
  # `echo ok`, `true` a `:` Judge odmieta ako formálnu výplň.
  - id: A1
    desc: "testy k zmenenej oblasti prechádzajú"
    cmd: "npm --prefix apps/crm test -- nieco"
    expect: exit_code == 0
  - id: A2
    desc: "nepribudla typová chyba"
    cmd: "node apps/crm/scripts/typecheck-baseline.mjs"
    expect: exit_code == 0
  - id: A3
    desc: "nepribudlo porušenie API kontraktu"
    cmd: "node apps/crm/scripts/check-api-contract.mjs --ci"
    expect: exit_code == 0
  - id: A4
    desc: "diff nevyšiel zo scope"
    cmd: "git diff --name-only origin/main...HEAD"
    expect: all_paths_in(scope.repo_paths)

budget:
  max_iterations: 8
  max_cost_usd: 3
  max_runtime_minutes: 30

risk: medium            # low | medium | high | critical
                        # high/critical => Judge vráti HUMAN aj keď všetko prejde

evidence:               # pôvodné polia schémy zostávajú
  commands: []
  files: []

verdict:                # VYPĹŇA IBA JUDGE
  result: null          # ACCEPT | REJECT | BLOCKED | HUMAN
  reason: null
  checked_at: null
  ledger_run_id: null
---

# TASK-XXXX — krátky názov

Čo sa má stať a prečo. Jeden odstavec.

## Najprv som hľadal

Čo som hľadal v `docs/`, `migrations/`, `lib/` a čo som našiel.
