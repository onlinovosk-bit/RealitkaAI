import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { generateRequestId, createLogger } from "@revolis/mcp-shared";
import type { ToolResponse, CallTranscript } from "@revolis/mcp-shared";

export const getCallTranscriptTool: Tool = {
  name: "get_call_transcript",
  description: "Retrieve the full transcript of a completed call. Polls Twilio / Deepgram until transcript is ready.",
  inputSchema: {
    type: "object",
    properties: {
      call_id:  { type: "string", description: "Call SID (CA_...) returned by initiate_call." },
      lead_id:  { type: "string" },
      format:   { type: "string", enum: ["FULL", "SEGMENTS_ONLY"], default: "FULL" },
    },
    required: ["call_id"],
    additionalProperties: false,
  },
};

interface GetCallTranscriptArgs {
  call_id: string;
  lead_id?: string;
  format?: "FULL" | "SEGMENTS_ONLY";
}

export async function handleGetCallTranscript(args: unknown) {
  const request_id = generateRequestId();
  const { call_id, lead_id } = args as GetCallTranscriptArgs;

  const log = createLogger({ request_id, server: "mcp-telephony", tool: "get_call_transcript", lead_id, agent_id: undefined });
  log.info("get_call_transcript called", { call_id });

  try {
    // TODO: Replace with real transcript fetch.
    // Option A — Twilio Intelligence:
    //   const transcripts = await client.intelligence.v2.transcripts.list({ callSid: call_id });
    // Option B — Deepgram (async, poll on callback URL):
    //   const response = await deepgram.transcription.preRecorded({ url: recording_url }, { punctuate: true, diarize: true });

    const mockTranscript: CallTranscript = {
      call_id,
      segments: [
        { speaker: "AGENT", text: "Dobrý deň, hovorím s pánom Novákom?", start_ms: 0,    end_ms: 2800,  confidence: 0.98 },
        { speaker: "LEAD",  text: "Áno, to som ja.",                      start_ms: 3000,  end_ms: 4500,  confidence: 0.97 },
        { speaker: "AGENT", text: "Volám ohľadom nehnuteľnosti na Hlavnej 12.", start_ms: 4800, end_ms: 7200, confidence: 0.96 },
      ],
      full_text: "AGENT: Dobrý deň, hovorím s pánom Novákom?\nLEAD: Áno, to som ja.\nAGENT: Volám ohľadom nehnuteľnosti na Hlavnej 12.",
      created_at: new Date().toISOString(),
    };

    log.info("get_call_transcript success", { segment_count: mockTranscript.segments.length });

    const response: ToolResponse<CallTranscript> = { success: true, data: mockTranscript, request_id };
    return { content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }] };
  } catch (err) {
    log.error("get_call_transcript failed", { err: String(err) });
    const response: ToolResponse<never> = {
      success: false, request_id,
      error: { code: "TRANSCRIPT_FETCH_FAILED", message: String(err) },
    };
    return { content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }], isError: true };
  }
}
