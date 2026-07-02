import { describe, expect, it } from "vitest";
import { parseCalendlyInviteeCreated } from "../calendly-payload";

describe("parseCalendlyInviteeCreated", () => {
  it("parses invitee.created with tracking", () => {
    const body = {
      event: "invitee.created",
      payload: {
        uri: "https://api.calendly.com/scheduled_events/AAA/invitees/BBB",
        email: "demo@rkpresov.sk",
        name: "Ján",
        event: "https://api.calendly.com/scheduled_events/AAA",
        scheduled_event: { start_time: "2026-06-12T09:00:00.000000Z" },
        tracking: { utm_content: "calc_loss_500|goals_leads" },
      },
    };
    const p = parseCalendlyInviteeCreated(body);
    expect(p?.email).toBe("demo@rkpresov.sk");
    expect(p?.scheduledAt).toBe("2026-06-12T09:00:00.000000Z");
    expect(p?.tracking?.utm_content).toContain("calc_loss");
  });

  it("returns null for other events", () => {
    expect(parseCalendlyInviteeCreated({ event: "invitee.canceled", payload: {} })).toBeNull();
  });
});
