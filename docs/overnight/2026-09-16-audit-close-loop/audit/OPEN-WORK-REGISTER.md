# OPEN WORK REGISTER — 2026-09-16 AUDIT

Generated: 2026-09-16T11:45:00+02:00  
Sources: `a1-git.json` + `a2-repo.json` + `a3-infra.json` + `a4-gates.json` (all present)  
Mode: AUDIT ONLY — preflight **BLOCK** (Judge runtime + missing `tc-orchestrator.mjs` on main)

## Counts by classification (kind)

| kind | count |
|---|---|
| zacate_nedotiahnute | 8 |
| hotove_nezapnute | 4 |
| zapnute_nesledovane | 2 |
| zrusene_neupratane | 1 |
| zdokumentovane_neplatne | 5 |

## Counts by state

| state | count |
|---|---|
| READY | 6 |
| BLOCKED | 6 |
| STALE | 2 |
| OBSOLETE | 1 |
| UNKNOWN | 4 |

## Sorted register (impact ↓, effort ↑)

| id | state | kind | impact | effort | blocked_by |
|---|---|---|---|---|---|
| orch:tc-orchestrator-missing-on-main | READY | zdokumentovane_neplatne | high | M | — |
| branch:chore/tc-orchestrator | READY | zacate_nedotiahnute | high | M | — (same identity as above; keep both ids, same territory) |
| workflow:scope-guard-b7-missing | READY | zdokumentovane_neplatne | high | M | — |
| gate:cost_usd_unmeasured | READY | zapnute_nesledovane | high | S | runtime:crm-node-modules-absent |
| task:TASK-NS-001-stale-status | READY | zdokumentovane_neplatne | medium | S | preflight:judge_exists |
| runner:contract-present | READY | hotove_nezapnute | high | S | preflight:judge_and_orchestrator |
| workflow:saas-grade-has-pr-synchronize | READY | hotove_nezapnute | low | S | — (informational) |
| branch:batch/tc-1 | BLOCKED | zacate_nedotiahnute | high | S | orch:tc-orchestrator-missing-on-main |
| task:TASK-TC-BATCH-1 | BLOCKED | zacate_nedotiahnute | high | S | orch:tc-orchestrator-missing-on-main |
| runtime:crm-node-modules-absent | BLOCKED | zacate_nedotiahnute | high | S | — (env) |
| pkg:typecheck-paydown-not-launched | BLOCKED | hotove_nezapnute | high | S | founder_signature |
| docs:ruflo-latest-pin | BLOCKED | zdokumentovane_neplatne | medium | S | ruflo_runtime_unverified |
| workflow:schema-governance-schedule-disabled | BLOCKED | hotove_nezapnute | medium | S | secrets:SCHEMA_GUARD_* |
| task:TASK-0003 | BLOCKED | zacate_nedotiahnute | medium | L | founder_GO_evidence_pack |
| task:TASK-0100-obsolete-vs-main | OBSOLETE | zdokumentovane_neplatne | medium | S | — |
| branch:feat/bridge-harness | STALE | zacate_nedotiahnute | medium | M | open_prs_unknown_no_network |
| worktrees:count-126 | STALE | zrusene_neupratane | low | L | task:TASK-0003 |
| branches:no-upstream-22 | UNKNOWN | zacate_nedotiahnute | medium | L | open_prs_unknown_no_network |
| workflow:brain-weekly-scheduled | UNKNOWN | zapnute_nesledovane | low | S | — |
| locks:typecheck-loop-absent | UNKNOWN | zacate_nedotiahnute | low | S | pkg:typecheck-paydown-not-launched |
| task:TASK-RLS-ONBOARDING-SESSION | UNKNOWN | zacate_nedotiahnute | high | M | open_prs_unknown_no_network |

## Seven questions

1. **Rozrobené a stojí?** `batch/tc-1` + TASK-TC-BATCH-1 (HUMAN approved, not finished); typecheck paydown NOT_LAUNCHED; bridge-harness without upstream; 22 no-upstream heads; 126 worktrees.
2. **Hotové, vypnuté?** Runner contract on main but execution substrate incomplete; schema-governance schedule disabled; typecheck package prepared unsigned.
3. **Beží, nesledované?** Ledger `cost_usd` always 0; brain-weekly schedule present with no local run ledger (Actions history not_in_repo).
4. **Brána tvrdí nepravdu?** Cannot diff merged PR `repo_paths` without network. Local: TASK-0100 still open while Judge on main; TASK-NS-001 IN_PROGRESS while ledger ACCEPT.
5. **Tvárí sa platné a nie je?** RUNNER.md cites `tc-orchestrator.mjs` which is not on main; Ruflo MCP `@latest` without verified runtime.
6. **Čo blokuje čo?** node_modules → Judge → any finish/verdict amend; missing orchestrator → TC batch finish + wave dispatch; founder signature → typecheck loop; secrets → schema cron; TASK-0003 → worktree cleanup.
7. **Čo by prestalo fungovať po zmazaní?** `judge.mjs` + baseline + bus tasks/ledger are live DONE-gate machinery on main; deleting them breaks the contract path even though orchestrator is missing.

## Dedup note

`orch:tc-orchestrator-missing-on-main` (A2) and `branch:chore/tc-orchestrator` (A1) share write territory `apps/crm/scripts/tc-orchestrator.mjs` — treat as one DAG node `orch:land-tc-orchestrator`.
