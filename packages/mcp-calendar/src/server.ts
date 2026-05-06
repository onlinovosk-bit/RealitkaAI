import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { findAvailableSlotsTool, handleFindAvailableSlots } from "./tools/find-available-slots.js";
import { createEventTool, handleCreateEvent } from "./tools/create-event.js";

const server = new Server(
  { name: "revolis-calendar-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [findAvailableSlotsTool, createEventTool],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "find_available_slots": return handleFindAvailableSlots(args);
    case "create_event":         return handleCreateEvent(args);
    default:
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
        isError: true,
      };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("Revolis Calendar MCP server ready (stdio)\n");
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
