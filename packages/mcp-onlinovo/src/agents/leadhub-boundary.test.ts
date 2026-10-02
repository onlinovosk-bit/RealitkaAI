import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * The LeadHub boundary, enforced as a static fact about the source tree (P08 §K: the LeadHub API
 * contract is UNKNOWN). The new agent code has no transport at all, so there is nothing to
 * mis-configure: no HTTP client, no browser automation, no subprocess, no LeadHub client, no invented
 * endpoint. When someone verifies the contract and adds a provider, this test must be changed
 * deliberately, in a founder-reviewed PR, not worked around.
 */
const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith(".ts") && !full.endsWith(".test.ts")) out.push(full);
  }
  return out;
}

const read = (file: string) => readFileSync(file, "utf8");
/** Code without comments: a comment may say "there is no LeadHubProvider"; code may not contain one. */
const code = (file: string) => read(file).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const rel = (file: string) => relative(SRC, file);

const AGENT_FILES = walk(join(SRC, "agents"));
const AGENT_TOOL_FILES = ["agent-support", "revenue-opportunities", "customer-next-action", "experiment-plan"].map((n) => join(SRC, "tools", `${n}.ts`));
const NEW_CODE = [...AGENT_FILES, ...AGENT_TOOL_FILES];
const ALL_CODE = walk(SRC);

// Anything that can reach the network, a browser, a shell or another process.
const TRANSPORT = [
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bchild_process\b/,
  /\bexecSync\b|\bspawnSync\b|\bspawn\s*\(|\bexec\s*\(/,
  /\bplaywright\b/i,
  /\bpuppeteer\b/i,
  /\bselenium\b/i,
  /node:(http|https|http2|net|tls|dgram|dns|worker_threads|cluster)\b/,
  /from\s+["'](http|https|http2|net|tls|dgram|dns)["']/,
  /\baxios\b|\bundici\b|\bnode-fetch\b|\bgot\b\s*\(|\bsuperagent\b/,
];

test("there is something to scan", () => {
  assert.ok(AGENT_FILES.length >= 12, `agent files: ${AGENT_FILES.length}`);
  for (const f of AGENT_TOOL_FILES) assert.ok(read(f).length > 0, rel(f));
  assert.ok(ALL_CODE.length > NEW_CODE.length);
});

test("the agent code contains no transport: no HTTP, no browser automation, no subprocess", () => {
  for (const file of NEW_CODE) {
    const text = read(file);
    for (const pattern of TRANSPORT) assert.equal(pattern.test(text), false, `${rel(file)} matches ${pattern}`);
  }
});

test("the agent code contains no URL at all, so no LeadHub endpoint can have been invented", () => {
  for (const file of NEW_CODE) {
    const text = read(file);
    assert.equal(/https?:\/\//i.test(text), false, `${rel(file)} contains a URL`);
    assert.equal(/\/api\/v\d|\/rest\/|\/graphql/i.test(text), false, `${rel(file)} looks like an endpoint path`);
  }
});

test("there is no LeadHub provider, client or credential anywhere in the package", () => {
  for (const file of ALL_CODE) {
    const text = code(file);
    assert.equal(/leadhub[._-]?(provider|client|api|sdk|adapter)/i.test(text), false, `${rel(file)} names a LeadHub client`);
    assert.equal(/\bLEADHUB_[A-Z_]*(KEY|TOKEN|SECRET|URL)\b/.test(text), false, `${rel(file)} reads a LeadHub credential`);
    assert.equal(/leadhub\.(co|io|com|cz|sk|app)\b/i.test(text), false, `${rel(file)} names a LeadHub host`);
  }
});

test("no source file in the package opens a network connection, and Shoptet over HTTP does not exist", () => {
  for (const file of ALL_CODE) {
    const text = read(file);
    for (const pattern of TRANSPORT) assert.equal(pattern.test(text), false, `${rel(file)} matches ${pattern}`);
  }
});

test("the only URL literal in the package is the pre-existing, unused Shoptet host constant", () => {
  const withUrl = ALL_CODE.filter((f) => /https?:\/\//i.test(read(f))).map(rel);
  assert.deepEqual(withUrl, ["adapters/shoptet-private.ts"]);
});

test("the agent code imports only relative modules, node:crypto and (tools only) the MCP SDK types", () => {
  const importRe = /(?:^|\n)\s*(?:import|export)\s[^;]*?from\s+["']([^"']+)["']/g;
  for (const file of NEW_CODE) {
    const isTool = AGENT_TOOL_FILES.includes(file);
    for (const m of read(file).matchAll(importRe)) {
      const spec = m[1];
      if (spec.startsWith(".")) continue;
      const ok = spec === "node:crypto" || (isTool && (spec === "@modelcontextprotocol/sdk/types.js" || spec === "@revolis/mcp-shared"));
      assert.ok(ok, `${rel(file)} imports ${spec}`);
    }
  }
});

test("the agent code cannot write the file system either", () => {
  for (const file of NEW_CODE) {
    const text = read(file);
    assert.equal(/node:fs|from\s+["']fs["']|writeFile|appendFile|createWriteStream/.test(text), false, rel(file));
  }
});
