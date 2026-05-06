import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { getLeadTool, handleGetLead } from "./tools/get-lead.js";
import { updateLeadTool, handleUpdateLead } from "./tools/update-lead.js";
import { listLeadsByFilterTool, handleListLeadsByFilter } from "./tools/list-leads-by-filter.js";

const server = new Server(
  { name: "revolis-crm-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [getLeadTool, updateLeadTool, listLeadsByFilterTool],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "get_lead":              return handleGetLead(args);
    case "update_lead":           return handleUpdateLead(args);
    case "list_leads_by_filter":  return handleListLeadsByFilter(args);
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
  process.stderr.write("Revolis CRM MCP server ready (stdio)\n");
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
