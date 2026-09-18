---
id: MSG-20260825-010-onl-mcp-001-result
type: result
status: done
owner: cursor-onl-mcp-001
created_at: 2026-08-25T21:30:00Z
updated_at: 2026-08-25T21:30:00Z
scope:
  repo_paths:
    - docs/onlinovo/ONL-MCP-FEASIBILITY.md
    - docs/reports/2026-08-25-onl-mcp-001-feasibility.md
  external_systems:
    - Shoptet
evidence:
  commands: []
  files:
    - docs/onlinovo/ONL-MCP-FEASIBILITY.md
    - .ai/bus/tasks/TASK-0005.md
  urls:
    - https://podpora.shoptet.cz/shoptet-mcp/
    - https://github.com/onlinovosk-bit/RealitkaAI/pull/476
next_action:
  gate: STOP
  description: Founder review of feasibility verdict; no ONL-MCP-002.
---

## Summary

ONL-MCP-001 ran **tonight** on founder override. Canonical verdict is in `docs/onlinovo/ONL-MCP-FEASIBILITY.md`: **BUILD** own Onlinovo MCP Gateway; **DON'T BUY** Shoptet Premium only to get official MCP; do not implement in this PR.

## Context

- Revolis night-wave PRs are out of scope; this lane does not touch `apps/crm`.
- Onlinovo.sk is Shoptet (public HTML fingerprint). Tariff Premium vs standard is **unknown**.
- Shoptet REST is addon-marketplace only; docs discourage single-shop-only partners.
- Official MCP is Premium-only at `https://mcp.shoptet.com/mcp`.

## Evidence

- Feasibility: `docs/onlinovo/ONL-MCP-FEASIBILITY.md`
- Night report: `docs/reports/2026-08-25-onl-mcp-001-feasibility.md`
- Task: `.ai/bus/tasks/TASK-0005.md` status `done`

## Next action

STOP. Founder confirms tariff. Do not open ONL-MCP-002/003/004 until GO.
