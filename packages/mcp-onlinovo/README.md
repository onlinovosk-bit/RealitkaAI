# @revolis/mcp-onlinovo (ONL-MCP-003)

Stdio MCP server for Onlinovo shop **read** tools. Follows `packages/mcp-crm`.

Default adapter is **fixture** (labeled `source: "fixture"`). Live Shoptet mapping is **not** in this MVP (`SHOP_MAPPING_BLOCKED`). Writes always return `WRITE_DISABLED_IN_MVP`.

```bash
npm run build --workspace=packages/mcp-shared
npm test --workspace=packages/mcp-onlinovo
ONLINOVO_SHOP_ADAPTER=fixture npx tsx packages/mcp-onlinovo/src/server.ts
```

Env: see `.env.example`. Never put tokens in git.

Ruflo/Cursor client config is ONL-MCP-004.
