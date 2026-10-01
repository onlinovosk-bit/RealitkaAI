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

test("Ruflo and Cursor MCP configs register onlinovo fixture server", () => {
  for (const rel of [".mcp.json", ".cursor/mcp.json"]) {
    const cfg = readJson(rel);
    assert.ok(cfg.mcpServers.ruflo, rel + " keeps ruflo");
    assert.ok(cfg.mcpServers.onlinovo, rel + " adds onlinovo");
    assert.ok(cfg.mcpServers.onlinovo.args?.some((arg) => arg.includes("mcp-onlinovo")));
    assert.equal(cfg.mcpServers.onlinovo.env?.ONLINOVO_SHOP_ADAPTER, "fixture");
  }
});

test("Claude example config registers onlinovo", () => {
  const cfg = readJson("packages/mcp-config.json");
  assert.ok(cfg.mcpServers.onlinovo);
});
