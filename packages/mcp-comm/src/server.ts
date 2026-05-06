import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { sendEmailTool, handleSendEmail } from "./tools/send-email.js";
import { sendSmsTool, handleSendSms } from "./tools/send-sms.js";
import { logInteractionTool, handleLogInteraction } from "./tools/log-interaction.js";

const server = new Server(
  { name: "revolis-comm-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [sendEmailTool, sendSmsTool, logInteractionTool],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "send_email":       return handleSendEmail(args);
    case "send_sms":         return handleSendSms(args);
    case "log_interaction":  return handleLogInteraction(args);
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
  process.stderr.write("Revolis Comm MCP server ready (stdio)\n");
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
