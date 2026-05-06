import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { generateRequestId, createLogger } from "@revolis/mcp-shared";
import type { ToolResponse, Interaction } from "@revolis/mcp-shared";

export const logInteractionTool: Tool = {
  name: "log_interaction",
  description: "Persist a communication event (email, SMS, call, note) to the CRM audit trail.",
  inputSchema: {
    type: "object",
    properties: {
      lead_id:   { type: "string" },
      agent_id:  { type: "string" },
      type: {
        type: "string",
        enum: ["EMAIL_SENT", "EMAIL_RECEIVED", "SMS_SENT", "SMS_RECEIVED", "CALL_INITIATED", "CALL_COMPLETED", "VIEWING_SCHEDULED", "NOTE_ADDED"],
      },
      channel:   { type: "string", enum: ["EMAIL", "SMS", "WHATSAPP", "CALL"] },
      content:   { type: "string", description: "Full message body or note text." },
      occurred_at: { type: "string", format: "date-time", description: "ISO 8601. Defaults to now if omitted." },
      metadata:  { type: "object", additionalProperties: true },
    },
    required: ["lead_id", "type", "channel", "content"],
    additionalProperties: false,
  },
};

interface LogInteractionArgs {
  lead_id: string;
  agent_id?: string;
  type: Interaction["type"];
  channel: Interaction["channel"];
  content: string;
  occurred_at?: string;
  metadata?: Record<string, unknown>;
}

export async function handleLogInteraction(args: unknown) {
  const request_id = generateRequestId();
  const { lead_id, agent_id, type, channel, content, occurred_at, metadata } = args as LogInteractionArgs;

  const log = createLogger({ request_id, server: "mcp-comm", tool: "log_interaction", lead_id, agent_id });
  log.info("log_interaction called", { type, channel });

  try {
    // TODO: Replace with Supabase insert.
    // await supabase.from("interactions").insert({ ... });

    const interaction: Interaction = {
      id: `int-${Date.now()}`,
      lead_id,
      agent_id,
      type,
      channel,
      content,
      occurred_at: occurred_at ?? new Date().toISOString(),
      metadata: metadata ?? {},
    };

    log.info("log_interaction success", { interaction_id: interaction.id });

    const response: ToolResponse<Interaction> = { success: true, data: interaction, request_id };
    return { content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }] };
  } catch (err) {
    log.error("log_interaction failed", { err: String(err) });
    const response: ToolResponse<never> = {
      success: false, request_id,
      error: { code: "LOG_FAILED", message: String(err) },
    };
    return { content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }], isError: true };
  }
}
