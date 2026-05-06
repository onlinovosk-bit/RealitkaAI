import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { generateRequestId, createLogger } from "@revolis/mcp-shared";
import type { ToolResponse, Call } from "@revolis/mcp-shared";

export const initiateCallTool: Tool = {
  name: "initiate_call",
  description: "Initiate an outbound phone call to a lead via Twilio Programmable Voice. Returns call SID for tracking.",
  inputSchema: {
    type: "object",
    properties: {
      lead_id:     { type: "string" },
      agent_id:    { type: "string" },
      to_phone:    { type: "string", description: "E.164 format: +421905111222" },
      from_phone:  { type: "string", description: "Verified Twilio number to call from." },
      twiml_url:   { type: "string", format: "uri", description: "URL serving TwiML instructions for the call." },
      record:      { type: "boolean", default: true, description: "Whether to record the call." },
      metadata:    { type: "object", additionalProperties: true },
    },
    required: ["lead_id", "agent_id", "to_phone"],
    additionalProperties: false,
  },
};

interface InitiateCallArgs {
  lead_id: string;
  agent_id: string;
  to_phone: string;
  from_phone?: string;
  twiml_url?: string;
  record?: boolean;
  metadata?: Record<string, unknown>;
}

export async function handleInitiateCall(args: unknown) {
  const request_id = generateRequestId();
  const { lead_id, agent_id, to_phone } = args as InitiateCallArgs;

  const log = createLogger({ request_id, server: "mcp-telephony", tool: "initiate_call", lead_id, agent_id });
  log.info("initiate_call called", { to: to_phone });

  try {
    // TODO: Replace with Twilio Programmable Voice.
    // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // const call = await client.calls.create({
    //   to: to_phone,
    //   from: from_phone ?? process.env.TWILIO_FROM_NUMBER,
    //   url: twiml_url,
    //   record,
    // });

    const mockCall: Call = {
      id: `CA_mock_${Date.now()}`,
      lead_id,
      agent_id,
      from_number: process.env.TWILIO_FROM_NUMBER ?? "+421000000000",
      to_number: to_phone,
      status: "INITIATED",
      initiated_at: new Date().toISOString(),
      metadata: {},
    };

    log.info("initiate_call success", { call_id: mockCall.id });

    const response: ToolResponse<Call> = { success: true, data: mockCall, request_id };
    return { content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }] };
  } catch (err) {
    log.error("initiate_call failed", { err: String(err) });
    const response: ToolResponse<never> = {
      success: false, request_id,
      error: { code: "CALL_INITIATION_FAILED", message: String(err) },
    };
    return { content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }], isError: true };
  }
}
