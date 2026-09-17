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
