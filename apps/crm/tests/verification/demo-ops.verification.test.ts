import { describe, expect, it } from "vitest";
import { parseCalendlyInviteeCreated } from "@/lib/demo-ops/calendly-payload";
import { demoAccentLines, extractEmailDomain, parseDemoUtm } from "@/lib/demo-ops/utm-parse";

describe("[verification] Demo-ops Calendly + UTM parsing", () => {
  it("parses invitee.created with UTM tracking for demo booking", () => {
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
    const parsed = parseCalendlyInviteeCreated(body);
    expect(parsed?.email).toBe("demo@rkpresov.sk");
    expect(parsed?.scheduledAt).toBe("2026-06-12T09:00:00.000000Z");
    expect(parsed?.tracking?.utm_content).toContain("calc_loss");
  });

  it("rejects non-invitee.created Calendly events", () => {
    expect(parseCalendlyInviteeCreated({ event: "invitee.canceled", payload: {} })).toBeNull();
  });

  it("parses demo landing UTM goals and calc_loss tokens", () => {
    const utm = parseDemoUtm("goals_leads_followup|calc_loss_2400");
    expect(utm.goals).toEqual(["leads", "followup"]);
    expect(utm.calcLossMonthly).toBe(2400);
    expect(extractEmailDomain("Makler@RK-Presov.sk")).toBe("rk-presov.sk");
  });

  it("builds three Slovak accent lines from selected demo goals", () => {
    const lines = demoAccentLines(["leads", "import"]);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("Lead triáž");
  });
});
