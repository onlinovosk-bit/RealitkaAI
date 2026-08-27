---
id: CTX-0002
type: context
status: open
owner: onlinovo-lane
created_at: 2026-08-25T21:15:00Z
updated_at: 2026-08-25T21:15:00Z
scope:
  repo_paths:
    - docs/prompts/onl-mcp-001-feasibility.md
    - .ai/bus/tasks/TASK-0005.md
  external_systems:
    - Onlinovo.sk
    - Shoptet
    - LeadHub
    - GA4
    - Google Search Console
next_action:
  gate: GO REQUIRED
  description: Read only until TASK-0005 start gate passes.
---

# CTX-0002 — ONL-MCP-001 brief (payload)

Kanonicý spustiteľný prompt: `docs/prompts/onl-mcp-001-feasibility.md`.

## Objective

Feasibility + architecture audit vlastného **Onlinovo MCP Gateway** (vendor-neutral). Nie jednorazové „Claude na Shoptet“. Nie produkčná implementácia.

Klienti: Claude, ChatGPT, Cursor, Claude Code, Ruffo Swarm, ďalší agenti  
→ ONLINOVO MCP GATEWAY → adapters → Shoptet + LeadHub + GA4 + GSC + P&L + produktové dáta.

## Štyri cesty (všetky povinné)

- **A BUY** — oficiálny Shoptet MCP / Premium (over aktuálnu dokumentáciu, nerátať „nie“ bez dôkazu)
- **B BUILD** — vlastný Shoptet addon/API + MCP. Otázka: *Can Onlinovo build a compliant Shoptet integration without buying Shoptet Premium?*
- **C BUILD** — export/data bridge → Onlinovo Data Layer → MCP
- **D FALLBACK** — browser adapter (nesmie byť primárna cesta, ak existuje API/data)

Hodnotiť aj cenu, TCO 1/3 roky, ROI na contribution/profit, ToS, limity, lock-in, Ruffo reuse.

## Gateway návrh (až v audite)

AI clients → MCP → Gateway → adapters (Shoptet, LeadHub, GA4, GSC, PnL, ProductData).  
READ / WRITE / ANALYTICS / ACTIONS. Write = silnejšie permissions. Destruktívne = human approval. Secrets nikdy do repa.

## Verdikt

Jednoznačne **BUILD / BUY / DON'T BUILD** + MVP len ak BUILD.  
002/003/004 až po tomto verdikte.
