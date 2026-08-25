---
id: ONL-MCP-004
title: Onlinovo MCP — Ruflo / Cursor client wiring
status: done (config + stdio smoke; Ruflo daemon not started)
created: 2026-08-25
depends_on:
  - ONL-MCP-003 (#478)
---

# ONL-MCP-004 — integrácia do Ruflo (Ruffo)

Founder hovorí **Ruffo**. V repe je klient **Ruflo** (`.mcp.json`, `.cursor/mcp.json`). Tento PR pridáva stdio server `onlinovo` **vedľa** Ruflo. Daemon Ruflo sa nespúšťa (D-2026-08-18-01).

## Čo sa zmenilo

| Súbor | Zmena |
|---|---|
| `.mcp.json` | server `onlinovo` (fixture) |
| `.cursor/mcp.json` | to isté pre Cursor |
| `packages/mcp-config.json` | Claude Desktop príklad |

Spustenie z **koreňa monorepa**:

```bash
npx tsx packages/mcp-onlinovo/src/server.ts
```

Cursor/Ruflo MCP:

```json
"onlinovo": {
  "type": "stdio",
  "command": "npx",
  "args": ["tsx", "packages/mcp-onlinovo/src/server.ts"],
  "env": { "ONLINOVO_SHOP_ADAPTER": "fixture" }
}
```

## Tooly, ktoré Ruflo vidí

- `onlinovo_health`
- `onlinovo_stock_low`
- `onlinovo_orders_open`
- `onlinovo_write_product` (deny)

## Čo toto NIE je

- Live Shoptet
- `ruflo mcp start` / raw Ruflo MCP server
- ChatGPT remote HTTP
- Zápis do e-shopu

## Smoke

```bash
npx tsx packages/mcp-onlinovo/src/client-smoke.ts
```

JSON-RPC cez stdio: `initialize` → `tools/list` → `onlinovo_health`. Bez Ruflo binárky.
