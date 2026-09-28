---
id: CTX-0002-onl-mcp-001
type: context
status: done
owner: cursor-onl-mcp-001
created_at: 2026-08-25T21:30:00Z
updated_at: 2026-08-25T21:30:00Z
scope:
  repo_paths:
    - docs/onlinovo/
  external_systems:
    - Shoptet
    - Onlinovo.sk
evidence:
  commands: []
  files:
    - docs/onlinovo/ONL-MCP-FEASIBILITY.md
  urls:
    - https://www.onlinovo.sk/
next_action:
  gate: STOP
  description: Reuse this packet; do not re-research paths A–D from scratch unless Shoptet docs change.
---

# CTX-0002 — Onlinovo MCP lane

Onlinovo is a separate P&L from Revolis CRM. Do not mix `apps/crm` diffs into ONL-MCP PRs.

**Platform:** Shoptet (verified public fingerprint 2026-08-25). **Tariff unknown.**

**Canonical doc:** `docs/onlinovo/ONL-MCP-FEASIBILITY.md`

**Hard rules:** no prod Shoptet writes, no secrets in repo, no ONL-MCP-002 without founder GO, no community MCP on prod.
