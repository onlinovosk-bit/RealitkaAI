# DAG summary — 2026-09-16 AUDIT

| metric | count |
|---|---|
| Candidate nodes considered | 5 |
| Executable READY (enter wave) | **1** (`bus:close-TASK-0100`, owner=founder) |
| With complete acceptance cmds | 2 |
| With **runnable** negative_case | **0** |
| Excluded (incomplete negative / Judge BLOCK / risk) | 4 |
| Cycles | 0 |

## Interpretation

Third number (negative cases) is **0**. Per layer 03: graph contains controls that cannot yet fail safely. Do **not** launch gate-adding nodes (`scope-guard`, `cost_usd`) until negative cases are expressible as real commands.

Preflight BLOCK also forbids EXECUTION regardless of this DAG.

## Write-territory collisions among candidates

| territory | nodes |
|---|---|
| `apps/crm/scripts/tc-orchestrator.mjs` | orch:land-tc-orchestrator only |
| `.github/workflows/scope-guard.yml` | gate:scope-guard-b7 only |
| `apps/crm/scripts/judge.mjs` | gate:cost_usd_null_when_unmeasured only |
| `.ai/bus/tasks/TASK-NS-001.md` | bus:reconcile-TASK-NS-001 only |
| `.ai/bus/tasks/TASK-0100.md` | bus:close-TASK-0100 only |

No write→write edges among candidates.
