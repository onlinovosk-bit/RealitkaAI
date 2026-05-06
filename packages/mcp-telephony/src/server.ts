import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { initiateCallTool, handleInitiateCall } from "./tools/initiate-call.js";
import { getCallTranscriptTool, handleGetCallTranscript } from "./tools/get-call-transcript.js";

const server = new Server(
  { name: "revolis-telephony-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [initiateCallTool, getCallTranscriptTool],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "initiate_call":        return handleInitiateCall(args);
    case "get_call_transcript":  return handleGetCallTranscript(args);
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
  process.stderr.write("Revolis Telephony MCP server ready (stdio)\n");
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
