import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

function envRecord(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") out[key] = value;
  }
  out.ONLINOVO_SHOP_ADAPTER = "fixture";
  return out;
}

async function main() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", path.join(repoRoot, "packages/mcp-onlinovo/src/server.ts")],
    env: envRecord(),
    cwd: repoRoot,
    stderr: "pipe",
  });

  const client = new Client({ name: "onlinovo-ruflo-smoke", version: "0.1.0" });
  await client.connect(transport);

  const listed = await client.listTools();
  const names = listed.tools.map((tool) => tool.name).sort();
  const health = await client.callTool({ name: "onlinovo_health", arguments: {} });
  const text = JSON.stringify(health);

  const okTools =
    names.includes("onlinovo_health") &&
    names.includes("onlinovo_stock_low") &&
    names.includes("onlinovo_orders_open") &&
    names.includes("onlinovo_write_product");

  if (!okTools) {
    throw new Error("missing onlinovo tools: " + names.join(","));
  }
  if (!text.includes("fixture") || !text.includes("write_enabled")) {
    throw new Error("health payload unexpected: " + text);
  }

  process.stderr.write("ONL-MCP-004 smoke PASS tools=" + names.join(",") + "\n");
  await client.close();
}

const entry = process.argv[1] ?? "";
if (entry.endsWith("client-smoke.ts") || entry.endsWith("client-smoke.js")) {
  main().catch((err) => {
    process.stderr.write("ONL-MCP-004 smoke FAIL " + String(err) + "\n");
    process.exit(1);
  });
}

export { main as runOnlinovoClientSmoke };
