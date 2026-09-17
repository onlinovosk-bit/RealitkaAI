---
id: ONL-MCP-002
title: Onlinovo MCP Gateway — implementačný návrh
status: proposal (no runtime in this PR)
created: 2026-08-25
depends_on: ONL-MCP-001 (#476)
---

# ONL-MCP-002 — implementačný návrh

> Founder GO: po výsledku ONL-MCP-001 ihneď dnes v noci. Tento PR je **návrh**, nie kód. Runtime je ONL-MCP-003. Ruflo wiring je ONL-MCP-004.
>
> Predpoklady z #476: **BUILD** vlastný gateway; **DON'T BUY** Premium kvôli MCP; tarif Onlinova = **NEZNÁME**; žiadny Shoptet prod write; žiadne secrets v repe.

---

## 1. Cieľ MVP (ONL-MCP-003)

Ruflo / Claude / Cursor vie cez **stdio MCP** (rovnaký vzor ako `packages/mcp-crm`) zavolať read-only tool:

- nízky sklad, **alebo**
- otvorené objednávky, **alebo**
- čestné `source: unconnected` / `source: fixture`

Write tool existuje ako **stub** a vždy vráti `WRITE_DISABLED_IN_MVP`.

**Mimo MVP:** Streamable HTTP `/mcp`, ChatGPT OAuth/DCR, live Shoptet bez tokenu v env, GA4/GSC/P&L, LeadHub, `apps/crm`.

---

## 2. Reuse vs nový balík

Existujúce servery: `packages/mcp-shared`, `mcp-crm`, `mcp-comm`, `mcp-calendar`, `mcp-telephony`. SDK: `@modelcontextprotocol/sdk`, transport **stdio**, `ToolResponse<T>` envelope, log na stderr.

| Alternatíva | Prečo nie |
|---|---|
| Pridať shop tooly do `mcp-crm` | Iný doména (PII e-shop vs CRM leady), iný auth, porušenie 1 server = 1 bounded context |
| Nový HTTP gateway od nuly | Feasibility chcela Streamable HTTP pre ChatGPT; MVP klienti (Ruflo, Cursor, Claude Code) už žerú **stdio**. HTTP = ONL-MCP-00x neskôr |
| Community `tomkalina/shoptet-mcp` | #476 DON'T BUILD ako primár |
| Oficiálny `mcp.shoptet.com` ako jediný server | Shoptet-only, Premium, bez nášho approval/audit |

**Rozhodnutie:** nový workspace `packages/mcp-onlinovo` + reuse `@revolis/mcp-shared` + existujúce SDK.

## Engineering justification: packages/mcp-onlinovo

- **Trigger:** new-file (nový workspace balík)
- **Decision path:** reuse (SDK + mcp-shared + stdio pattern); new-code len Onlinovo adapter/policy
- **Alternatives considered:** extend mcp-crm (zamietnuté — iný bounded context); HTTP-only gateway (odložené — ChatGPT DCR nie je MVP)
- **Why not reuse:** N/A na celý server; reuse platí na SDK/logger/envelope. Shop store do CRM store by duplikoval zmysel „CRM“.
- **Expected outcome:** Ruflo vie read-only shop tooly bez Premium lock-in a bez prod write
- **Related paths:** `packages/mcp-crm/src/server.ts`, `packages/mcp-shared`, `docs/onlinovo/ONL-MCP-FEASIBILITY.md` (#476)
- **Contradiction check:** none — neruší D-2026-08-18-01 (Ruflo daemon ostáva vypnutý; 004 len pridá druhý stdio server)

---

## 3. Strom súborov (003)

```
packages/mcp-onlinovo/
  package.json                 # @revolis/mcp-onlinovo
  tsconfig.json                # kópia mcp-crm
  src/server.ts                # stdio Server, tool registry
  src/policy.ts                # READ allow, WRITE deny
  src/audit.ts                 # stderr JSON audit (žiadne tokeny, PII redaction)
  src/resolve-adapter.ts       # env → fixture | unconnected | shoptet
  src/adapters/types.ts
  src/adapters/fixture.ts      # označené fixture SKU, žiadne reálne PII
  src/adapters/unconnected.ts  # source: unconnected
  src/adapters/shoptet-private.ts  # volá api.myshoptet.com LEN ak je token v env
  src/tools/health.ts
  src/tools/stock-low.ts
  src/tools/orders-open.ts
  src/tools/write-stub.ts
  src/*.test.ts
```

Root `package.json` workspaces: pridať `packages/mcp-onlinovo`.

---

## 4. Tool contract

Názvy `onlinovo_*` (namespace; nepliesť s `get_lead`).

| Tool | Side | Správanie |
|---|---|---|
| `onlinovo_health` | READ | `{ adapter, write_enabled: false, shop_connected: boolean }` |
| `onlinovo_stock_low` | READ | `{ source, items[{ sku, qty, threshold }] }` ; `source` = fixture \| unconnected \| shoptet |
| `onlinovo_orders_open` | READ | `{ source, orders[{ id, status, age_hours }] }` — **žiadne mená/emaily** v default výstupe |
| `onlinovo_write_product` | WRITE | vždy fail `WRITE_DISABLED_IN_MVP` |

Envelope: existujúce `ToolResponse<T>` z mcp-shared.

Fikcia dát zakázaná: fixture adapter **musí** vrátiť `source: "fixture"`. Nikdy `source: "shoptet"` bez HTTP 2xx z API.

---

## 5. Adapter policy (tarif stále NEZNÁME)

| `ONLINOVO_SHOP_ADAPTER` | Token `SHOPTET_PRIVATE_API_TOKEN` | Výsledok |
|---|---|---|
| unset / `fixture` | ignorovaný | fixture (default MVP, bezpečné) |
| `unconnected` | ignorovaný | honest empty |
| `shoptet` | chýba | fail-closed → správa sa ako unconnected + `error.code=SHOP_TOKEN_MISSING` na health |
| `shoptet` | set | GET Private API; 401/403 → fail-closed, žiadny fake |

Žiadny token v gite, `.env.example` len mená premenných.

Live Shoptet v tejto noci **nespúšťame** (žiadny token v tomto prostredí = očakávané).

Path C (XML feed) nie je v MVP kóde — až keď founder potvrdí tarif a feed URL.

---

## 6. Security

1. Write default deny.
2. Audit na stderr: tool, request_id, adapter, latency; **nie** token, **nie** raw customer.
3. Shoptet adapter: header `Shoptet-Private-API-Token`; nikdy nelogovať hodnotu.
4. Fail closed.
5. Žiadny `apps/crm` diff v 003.

---

## 7. ONL-MCP-004 — Ruflo

Repo používa **Ruflo** (`.mcp.json` / `.cursor/mcp.json`). Founder hovorí „Ruffo“ = ten istý klient.

004 **pridá** stdio server `onlinovo` vedľa existujúceho `ruflo`. **Nemeniť** Ruflo pin/daemon (D-2026-08-18-01). **Nespúšťať** `ruflo mcp start` ako súčasť tohto PR.

```json
"onlinovo": {
  "type": "stdio",
  "command": "npx",
  "args": ["tsx", "packages/mcp-onlinovo/src/server.ts"],
  "env": { "ONLINOVO_SHOP_ADAPTER": "fixture" }
}
```

Smoke: JSON-RPC `initialize` + `tools/list` + `tools/call onlinovo_health` cez stdio (skript v 003, Ruflo config v 004).

---

## 8. Test plán (003)

1. Node test: fixture stock_low má `source=fixture` a SKU.
2. Node test: write stub `success=false`, kód `WRITE_DISABLED_IN_MVP`.
3. Node test: adapter `shoptet` bez tokenu → health `shop_connected=false`, žiadny fetch.
4. Node test: orders_open výstup neobsahuje `@` (žiadny email).
5. Smoke skript stdio (bez Ruflo binárky).

---

## 9. Vetvy / PR (1 logická zmena)

| ID | Vetva | Obsah |
|---|---|---|
| 002 | `cursor/onl-mcp-002-impl-plan-db1f` | tento dokument |
| 003 | `cursor/onl-mcp-003-mvp-db1f` | `packages/mcp-onlinovo` + testy |
| 004 | `cursor/onl-mcp-004-ruffo-db1f` | `.mcp.json`, `.cursor/mcp.json`, `packages/mcp-config.json` |

Merge: founder. Agent **nemerguje**.

---

## 10. STOP pravidlá pre 003/004

- Žiadny Shoptet prod write
- Žiadny secret v repe
- Žiadny fake `source: shoptet`
- Žiadny Ruflo daemon
- Žiadny ChatGPT OAuth
