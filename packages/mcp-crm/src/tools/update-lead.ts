import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { generateRequestId, createLogger } from "@revolis/mcp-shared";
import type { ToolResponse, Lead, LeadStage, LeadIntent, LeadPersona, LeadPriority } from "@revolis/mcp-shared";
import { updateLead } from "../store/in-memory.js";

export const updateLeadTool: Tool = {
  name: "update_lead",
  description: "Patch a lead's mutable fields. Only the provided fields are updated; omitted fields remain unchanged.",
  inputSchema: {
    type: "object",
    properties: {
      lead_id: { type: "string", description: "Lead identifier." },
      stage: {
        type: "string",
        enum: ["NEW", "CONTACTED", "QUALIFIED", "VIEWING_SCHEDULED", "NEGOTIATING", "CLOSED_WON", "CLOSED_LOST", "DEAD"],
        description: "New CRM stage.",
      },
      intent: {
        type: "string",
        enum: ["BUY_NOW", "JUST_LOOKING", "INVESTOR", "UNKNOWN"],
      },
      persona: {
        type: "string",
        enum: ["INVESTOR", "FAMILY", "DOWNSIZER", "OTHER"],
      },
      priority: {
        type: "string",
        enum: ["HIGH", "MEDIUM", "LOW"],
      },
      assigned_agent_id: { type: "string", description: "Agent to assign the lead to." },
      listing_id: { type: "string", description: "Linked property listing." },
      metadata: {
        type: "object",
        description: "Arbitrary key-value pairs to merge into lead metadata.",
        additionalProperties: true,
      },
    },
    required: ["lead_id"],
    additionalProperties: false,
  },
};

interface UpdateLeadArgs {
  lead_id: string;
  stage?: LeadStage;
  intent?: LeadIntent;
  persona?: LeadPersona;
  priority?: LeadPriority;
  assigned_agent_id?: string;
  listing_id?: string;
  metadata?: Record<string, unknown>;
}

export async function handleUpdateLead(args: unknown) {
  const request_id = generateRequestId();
  const { lead_id, ...patch } = args as UpdateLeadArgs;

  const log = createLogger({ request_id, server: "mcp-crm", tool: "update_lead", lead_id });
  log.info("update_lead called", { patch_keys: Object.keys(patch) });

  const updated = updateLead(lead_id, patch);

  const response: ToolResponse<Lead> = updated
    ? { success: true, data: updated, request_id }
    : {
        success: false,
        request_id,
        error: { code: "LEAD_NOT_FOUND", message: `No lead with id=${lead_id}` },
      };

  log.info("update_lead result", { success: response.success });

  return {
    content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }],
    isError: !response.success,
  };
}
