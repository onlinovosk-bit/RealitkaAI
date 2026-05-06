import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { generateRequestId, createLogger } from "@revolis/mcp-shared";
import type { ToolResponse } from "@revolis/mcp-shared";

export const sendSmsTool: Tool = {
  name: "send_sms",
  description: "Send an SMS to a lead via Twilio (or compatible provider).",
  inputSchema: {
    type: "object",
    properties: {
      lead_id:    { type: "string" },
      to_phone:   { type: "string", description: "E.164 format, e.g. +421905111222" },
      body:       { type: "string", maxLength: 1600, description: "SMS text content." },
      agent_id:   { type: "string" },
      from_phone: { type: "string", description: "Override sender number (must be a verified Twilio number)." },
      metadata:   { type: "object", additionalProperties: true },
    },
    required: ["lead_id", "to_phone", "body"],
    additionalProperties: false,
  },
};

interface SendSmsArgs {
  lead_id: string;
  to_phone: string;
  body: string;
  agent_id?: string;
  from_phone?: string;
  metadata?: Record<string, unknown>;
}

interface SendSmsResult {
  message_sid: string;
  provider: string;
  queued_at: string;
  character_count: number;
}

export async function handleSendSms(args: unknown) {
  const request_id = generateRequestId();
  const { lead_id, to_phone, body, agent_id } = args as SendSmsArgs;

  const log = createLogger({ request_id, server: "mcp-comm", tool: "send_sms", lead_id, agent_id });
  log.info("send_sms called", { to: to_phone, length: body.length });

  try {
    // TODO: Replace with Twilio call.
    // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // const msg = await client.messages.create({
    //   body,
    //   from: from_phone ?? process.env.TWILIO_FROM_NUMBER,
    //   to: to_phone,
    // });

    const mockResult: SendSmsResult = {
      message_sid: `SM_mock_${Date.now()}`,
      provider: "mock",
      queued_at: new Date().toISOString(),
      character_count: body.length,
    };

    log.info("send_sms success", { message_sid: mockResult.message_sid });

    const response: ToolResponse<SendSmsResult> = { success: true, data: mockResult, request_id };
    return { content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }] };
  } catch (err) {
    log.error("send_sms failed", { err: String(err) });
    const response: ToolResponse<never> = {
      success: false, request_id,
      error: { code: "SMS_SEND_FAILED", message: String(err) },
    };
    return { content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }], isError: true };
  }
}
