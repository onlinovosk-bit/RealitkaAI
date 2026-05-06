import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { generateRequestId, createLogger } from "@revolis/mcp-shared";
import type { ToolResponse, CalendarEvent } from "@revolis/mcp-shared";

export const createEventTool: Tool = {
  name: "create_event",
  description: "Create a calendar event for a property viewing. Sends invites to agent and lead.",
  inputSchema: {
    type: "object",
    properties: {
      agent_id:    { type: "string" },
      lead_id:     { type: "string" },
      listing_id:  { type: "string" },
      title:       { type: "string", maxLength: 200 },
      description: { type: "string" },
      location:    { type: "string", description: "Property address." },
      start:       { type: "string", format: "date-time", description: "ISO 8601 with timezone offset." },
      end:         { type: "string", format: "date-time" },
      attendees:   {
        type: "array",
        items: { type: "string", format: "email" },
        description: "Email addresses to invite.",
      },
      send_invites: { type: "boolean", default: true },
      metadata:    { type: "object", additionalProperties: true },
    },
    required: ["agent_id", "lead_id", "title", "start", "end"],
    additionalProperties: false,
  },
};

interface CreateEventArgs {
  agent_id: string;
  lead_id: string;
  listing_id?: string;
  title: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  attendees?: string[];
  send_invites?: boolean;
  metadata?: Record<string, unknown>;
}

export async function handleCreateEvent(args: unknown) {
  const request_id = generateRequestId();
  const a = args as CreateEventArgs;

  const log = createLogger({ request_id, server: "mcp-calendar", tool: "create_event", lead_id: a.lead_id, agent_id: a.agent_id });
  log.info("create_event called", { start: a.start, end: a.end, location: a.location });

  try {
    // TODO: Replace with Google Calendar API.
    // const event = await cal.events.insert({
    //   calendarId: "primary",
    //   sendUpdates: a.send_invites ? "all" : "none",
    //   requestBody: {
    //     summary: a.title, description: a.description, location: a.location,
    //     start: { dateTime: a.start }, end: { dateTime: a.end },
    //     attendees: a.attendees?.map((email) => ({ email })),
    //   },
    // });

    const event: CalendarEvent = {
      id: `evt-mock-${Date.now()}`,
      title: a.title,
      description: a.description,
      location: a.location,
      start: a.start,
      end: a.end,
      attendees: a.attendees ?? [],
      lead_id: a.lead_id,
      listing_id: a.listing_id,
      agent_id: a.agent_id,
      metadata: a.metadata ?? {},
    };

    log.info("create_event success", { event_id: event.id });

    const response: ToolResponse<CalendarEvent> = { success: true, data: event, request_id };
    return { content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }] };
  } catch (err) {
    log.error("create_event failed", { err: String(err) });
    const response: ToolResponse<never> = {
      success: false, request_id,
      error: { code: "EVENT_CREATE_FAILED", message: String(err) },
    };
    return { content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }], isError: true };
  }
}
