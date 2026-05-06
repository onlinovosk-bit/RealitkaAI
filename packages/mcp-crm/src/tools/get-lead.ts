import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { generateRequestId, createLogger } from "@revolis/mcp-shared";
import type { ToolResponse, Lead } from "@revolis/mcp-shared";
import { getLead } from "../store/in-memory.js";

export const getLeadTool: Tool = {
  name: "get_lead",
  description: "Retrieve a single lead by ID. Returns full lead profile including stage, intent, persona, and assigned agent.",
  inputSchema: {
    type: "object",
    properties: {
      lead_id: {
        type: "string",
        description: "Unique identifier of the lead (UUID).",
      },
    },
    required: ["lead_id"],
    additionalProperties: false,
  },
};

export async function handleGetLead(args: unknown) {
  const request_id = generateRequestId();
  const { lead_id } = args as { lead_id: string };

  const log = createLogger({ request_id, server: "mcp-crm", tool: "get_lead", lead_id });
  log.info("get_lead called");

  const lead = getLead(lead_id);

  const response: ToolResponse<Lead> = lead
    ? { success: true, data: lead, request_id }
    : {
        success: false,
        request_id,
        error: { code: "LEAD_NOT_FOUND", message: `No lead with id=${lead_id}` },
      };

  log.info("get_lead result", { found: !!lead });

  return {
    content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }],
    isError: !response.success,
  };
}
