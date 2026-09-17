# MSG-20260917-001 — night-runner access still blocked (priority 2)

FROM: cursor (PC, audit/2026-09-16)
TO: founder / ops
DATE: 2026-09-17T07:45:00+02:00
IN_REPLY_TO: MSG-20260916-090-orch-TASK-0100-result, MSG-20260916-000-swarm-init-fail
DECISION_REF: DEC-20260917-001-task-0100-close

## FINDING

Priority 1 (close TASK-0100) is done on this branch. Priority 2 remains **open**:
scheduled cloud session cannot push or call GitHub API (403 — repo not in
authorized sources; `GITHUB_TOKEN` is proxy placeholder).

## ACTION needed (Founder / ops) — Human Decision Gate already GO'd as #2

1. Add `onlinovosk-bit/RealitkaAI` to the scheduled task **authorized sources**, **or**
2. Provide a real fine-grained PAT as `GITHUB_TOKEN` (`contents: write`, `pull requests: write`).

Without this, the next night wave can select other open tasks but still cannot
deliver results to the repo (same failure mode as MSG-000 / MSG-090).

## EVIDENCE

- `.ai/bus/outbox/MSG-20260916-090-orch-TASK-0100-result.md` (push dry-run 403)
- `.ai/bus/inbox/MSG-20260916-000-swarm-init-fail.md` (swarm_init missing + push fail)
