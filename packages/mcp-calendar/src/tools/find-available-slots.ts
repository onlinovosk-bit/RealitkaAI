import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { generateRequestId, createLogger } from "@revolis/mcp-shared";
import type { ToolResponse, TimeSlot } from "@revolis/mcp-shared";

export const findAvailableSlotsTool: Tool = {
  name: "find_available_slots",
  description: "Query an agent's calendar for available time windows within a date range. Returns 2–5 candidate slots.",
  inputSchema: {
    type: "object",
    properties: {
      agent_id:        { type: "string", description: "Agent whose calendar to query." },
      lead_id:         { type: "string" },
      date_from:       { type: "string", format: "date", description: "Start of search window (YYYY-MM-DD)." },
      date_to:         { type: "string", format: "date", description: "End of search window (YYYY-MM-DD)." },
      duration_minutes:{ type: "number", minimum: 15, maximum: 180, default: 60 },
      preferred_times: {
        type: "array",
        items: { type: "string", enum: ["MORNING", "AFTERNOON", "EVENING"] },
        description: "Lead's time preferences to prioritise.",
      },
      timezone:        { type: "string", default: "Europe/Bratislava" },
    },
    required: ["agent_id", "date_from", "date_to"],
    additionalProperties: false,
  },
};

interface FindAvailableSlotsArgs {
  agent_id: string;
  lead_id?: string;
  date_from: string;
  date_to: string;
  duration_minutes?: number;
  preferred_times?: string[];
  timezone?: string;
}

export async function handleFindAvailableSlots(args: unknown) {
  const request_id = generateRequestId();
  const { agent_id, lead_id, date_from, date_to, duration_minutes = 60 } = args as FindAvailableSlotsArgs;

  const log = createLogger({ request_id, server: "mcp-calendar", tool: "find_available_slots", lead_id, agent_id });
  log.info("find_available_slots called", { date_from, date_to, duration_minutes });

  try {
    // TODO: Replace with real calendar API.
    // Google Calendar: https://developers.google.com/calendar/api/v3/reference/freebusy
    // const auth = new google.auth.JWT({ ... });
    // const cal = google.calendar({ version: "v3", auth });
    // const busy = await cal.freebusy.query({ requestBody: { items: [{ id: agent_id }], timeMin, timeMax } });
    // ... compute free slots from busy blocks

    const base = new Date(`${date_from}T09:00:00+02:00`);
    const mockSlots: TimeSlot[] = Array.from({ length: 3 }, (_, i) => {
      const start = new Date(base.getTime() + i * 24 * 60 * 60 * 1000 + i * 60 * 60 * 1000);
      const end   = new Date(start.getTime() + duration_minutes * 60 * 1000);
      return { start: start.toISOString(), end: end.toISOString() };
    });

    log.info("find_available_slots result", { count: mockSlots.length });

    const response: ToolResponse<{ slots: TimeSlot[]; agent_id: string; timezone: string }> = {
      success: true, request_id,
      data: { slots: mockSlots, agent_id, timezone: "Europe/Bratislava" },
    };
    return { content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }] };
  } catch (err) {
    log.error("find_available_slots failed", { err: String(err) });
    const response: ToolResponse<never> = {
      success: false, request_id,
      error: { code: "CALENDAR_QUERY_FAILED", message: String(err) },
    };
    return { content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }], isError: true };
  }
}
