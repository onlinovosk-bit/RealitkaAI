import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { handleHealth, healthTool } from "./tools/health.js";
import { handleOrdersOpen, ordersOpenTool } from "./tools/orders-open.js";
import { handleStockLow, stockLowTool } from "./tools/stock-low.js";
import { handleWriteProduct, writeProductTool } from "./tools/write-stub.js";

const tools = [healthTool, stockLowTool, ordersOpenTool, writeProductTool];

const server = new Server(
  { name: "onlinovo-mcp-server", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  switch (name) {
    case "onlinovo_health":
      return handleHealth(args);
    case "onlinovo_stock_low":
      return handleStockLow(args);
    case "onlinovo_orders_open":
      return handleOrdersOpen(args);
    case "onlinovo_write_product":
      return handleWriteProduct(args);
    default:
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
        isError: true,
      };
  }
});

export { server, tools };

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(
    "Onlinovo MCP server ready (stdio) adapter=" + (process.env.ONLINOVO_SHOP_ADAPTER ?? "fixture") + "\n"
  );
}

const entry = process.argv[1] ?? "";
if (entry.endsWith("server.ts") || entry.endsWith("server.js")) {
  main().catch((err) => {
    process.stderr.write(`Fatal: ${err}\n`);
    process.exit(1);
  });
}
