import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readJson(rel: string) {
  return JSON.parse(readFileSync(path.join(repoRoot, rel), "utf8")) as {
    mcpServers: Record<string, { args?: string[]; env?: Record<string, string> }>;
  };
}

test("Cursor MCP config registers ruflo and onlinovo fixture server", () => {
  const cfg = readJson(".cursor/mcp.json");
  assert.ok(cfg.mcpServers.ruflo, ".cursor/mcp.json keeps ruflo");
  assert.ok(cfg.mcpServers.onlinovo, ".cursor/mcp.json adds onlinovo");
  assert.ok(cfg.mcpServers.onlinovo.args?.includes("mcp:onlinovo"), "onlinovo starts via the mcp:onlinovo script");
  assert.equal(cfg.mcpServers.onlinovo.env?.ONLINOVO_SHOP_ADAPTER, "fixture");
});

test("Cursor MCP config is portable: no hard-coded C:/RealitkaAI, onlinovo builds mcp-shared first", () => {
  const raw = readFileSync(path.join(repoRoot, ".cursor/mcp.json"), "utf8");
  assert.ok(!raw.includes("C:/RealitkaAI"), "use ${workspaceFolder}");
  assert.ok(raw.includes("${workspaceFolder}"));
  const scripts = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8")).scripts as Record<string, string>;
  assert.match(scripts["mcp:build"], /packages\/mcp-shared/);
  assert.match(scripts["mcp:onlinovo"], /mcp:build/);
  assert.match(scripts["mcp:onlinovo"], /mcp-onlinovo\/src\/server\.ts/);
});

// Projektový .mcp.json sa načíta aj v cloud sessions, kde ruflo (lokálna Windows cesta) ani onlinovo
// (mcp-shared nie je zbuilovaný) nenabehnú; každý turn tak hlásil chybu. Oba bežia len lokálne
// (user scope) — viď README.md. Test stráži, aby sa tam nevrátili bez rozhodnutia.
test("project .mcp.json registers no servers that cannot start in cloud sessions", () => {
  const cfg = readJson(".mcp.json");
  assert.deepEqual(Object.keys(cfg.mcpServers), []);
});

test("Claude example config registers onlinovo", () => {
  const cfg = readJson("packages/mcp-config.json");
  assert.ok(cfg.mcpServers.onlinovo);
});
