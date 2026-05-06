import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { generateRequestId, createLogger } from "@revolis/mcp-shared";
import type { ToolResponse, Lead } from "@revolis/mcp-shared";
import { listLeadsByFilter } from "../store/in-memory.js";

export const listLeadsByFilterTool: Tool = {
  name: "list_leads_by_filter",
  description: "Query leads by one or more filter criteria. Supports pagination via limit/offset.",
  inputSchema: {
    type: "object",
    properties: {
      stage: {
        type: "string",
        enum: ["NEW", "CONTACTED", "QUALIFIED", "VIEWING_SCHEDULED", "NEGOTIATING", "CLOSED_WON", "CLOSED_LOST", "DEAD"],
      },
      intent:   { type: "string", enum: ["BUY_NOW", "JUST_LOOKING", "INVESTOR", "UNKNOWN"] },
      persona:  { type: "string", enum: ["INVESTOR", "FAMILY", "DOWNSIZER", "OTHER"] },
      priority: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
      assigned_agent_id: { type: "string" },
      source: { type: "string", description: "Lead source channel (e.g. 'portal-nehnutelnosti')." },
      limit:  { type: "number", minimum: 1, maximum: 200, default: 50 },
      offset: { type: "number", minimum: 0, default: 0 },
    },
    additionalProperties: false,
  },
};

export async function handleListLeadsByFilter(args: unknown) {
  const request_id = generateRequestId();
  const filter = (args ?? {}) as Parameters<typeof listLeadsByFilter>[0];

  const log = createLogger({ request_id, server: "mcp-crm", tool: "list_leads_by_filter" });
  log.info("list_leads_by_filter called", { filter });

  try {
    const { leads, total } = listLeadsByFilter(filter);
    const response: ToolResponse<{ leads: Lead[]; total: number; returned: number }> = {
      success: true,
      request_id,
      data: { leads, total, returned: leads.length },
    };
    log.info("list_leads_by_filter result", { total, returned: leads.length });
    return { content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }] };
  } catch (err) {
    log.error("list_leads_by_filter failed", { err: String(err) });
    const response: ToolResponse<never> = {
      success: false,
      request_id,
      error: { code: "INTERNAL_ERROR", message: String(err) },
    };
    return { content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }], isError: true };
  }
}
