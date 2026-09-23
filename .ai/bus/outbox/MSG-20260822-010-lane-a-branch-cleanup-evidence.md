---
id: MSG-20260822-010-lane-a-branch-cleanup-evidence
type: result
from: lane-a
to: orchestrator
created: 2026-08-22
status: done
owner: cursor-agent
gate: GO REQUIRED
next_action:
  gate: GO REQUIRED
  summary: Review N=92 tip SHA table; do not delete; backup refs not pushed.
---

# Lane A result — TASK-0003 evidence

- Shallow: **false**
- origin heads: **369**
- Delete candidates (ancestor + ahead=0 + no open PR + untagged + not main): **92**
- Keep: **277** (276 ahead of main, 36 open PR heads, 1 protected)
- Full table: `docs/reports/2026-08-22-branch-cleanup-evidence.md`
- **No** `git push --delete`. **No** `refs/cleanup/*` push.

Cherry/ancestry: every candidate tip is ancestor of `origin/main` `76bb31080aa0f6b7a0d77c33e5835402e64ee9ce`.
