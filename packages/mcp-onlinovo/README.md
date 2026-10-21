# @revolis/mcp-onlinovo (ONL-MCP-003)

Stdio MCP server for Onlinovo shop **read** tools. Follows `packages/mcp-crm`.

Default adapter is **fixture** (labeled `source: "fixture"`). Live Shoptet mapping is **not** in this MVP (`SHOP_MAPPING_BLOCKED`). Writes always return `WRITE_DISABLED_IN_MVP`.

```bash
npm run build --workspace=packages/mcp-shared
npm test --workspace=packages/mcp-onlinovo
ONLINOVO_SHOP_ADAPTER=fixture npx tsx packages/mcp-onlinovo/src/server.ts
```

Env: see `.env.example`. Never put tokens in git.

Ruflo/Cursor client config is ONL-MCP-004 (`.cursor/mcp.json`).

## Claude Code: iba lokálne (user scope), nie v projektovom `.mcp.json`

Projektový `.mcp.json` je prázdny od 2026-10-21 (STRUCTURE-FIRST-1). Cloud session ho načíta a:
- `onlinovo` padá na `ERR_MODULE_NOT_FOUND … @revolis/mcp-shared/dist/index.js` (balík nie je zbuilovaný),
- `ruflo` nabieha cez lokálnu cestu `C:/RealitkaAI`, v cloude `CONNECT_TIMEOUT`.

Lokálne na počítači foundera (raz; overiť `claude mcp list`):

```bash
claude mcp add --scope user ruflo -e CLAUDE_FLOW_CWD=C:/RealitkaAI -- npx -y ruflo@latest mcp start
npm run build --workspace=packages/mcp-shared
claude mcp add --scope user onlinovo -e ONLINOVO_SHOP_ADAPTER=fixture -e CLAUDE_FLOW_CWD=C:/RealitkaAI -- npx tsx packages/mcp-onlinovo/src/server.ts
```
