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

## Claude Code: iba lokálne (scope `local`), nie v projektovom `.mcp.json`

Projektový `.mcp.json` je prázdny od 2026-10-21 (STRUCTURE-FIRST-1). Cloud session ho načíta a:
- `onlinovo` padal na `ERR_MODULE_NOT_FOUND … @revolis/mcp-shared/dist/index.js` (balík nebol zbuilovaný),
- `ruflo` nabieha cez lokálnu cestu `C:/RealitkaAI`, v cloude `CONNECT_TIMEOUT`.

Lokálne na počítači foundera, **z koreňa repa** (scope `local` je viazaný na projekt, preto relatívne cesty fungujú;
`--scope user` s relatívnou cestou mimo koreňa repa nenabehne). Raz:

```bash
npm ci
claude mcp add --scope local ruflo -e CLAUDE_FLOW_CWD=C:/RealitkaAI -- npx -y ruflo@latest mcp start
claude mcp add --scope local onlinovo -- npm run --silent mcp:onlinovo
claude mcp list
```

`npm run mcp:onlinovo` najprv zbuilduje `packages/mcp-shared` (`npm run mcp:build`), potom spustí server.
Adapter je predvolene `fixture` (`src/resolve-adapter.ts`), premenná sa nastavovať nemusí. `--silent` je nutné:
bez neho by npm vypísal hlavičku skriptu na stdout a rozbil by protokol MCP.

Smoke test (potrebuje zbuilovaný `mcp-shared`): `npm run mcp:build && npm run smoke --workspace=packages/mcp-onlinovo`.

Cursor číta `.cursor/mcp.json`, kde je cesta `${workspaceFolder}` (podporované podľa dokumentácie Cursora,
sekcia „Config interpolation"), takže nezávisí od `C:/RealitkaAI`.
