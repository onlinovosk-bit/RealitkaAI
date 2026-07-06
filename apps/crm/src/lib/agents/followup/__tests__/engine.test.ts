import { describe, expect, it } from "vitest";
import { evaluateFollowupLead } from "@/lib/agents/followup/engine";

const NOW = Date.parse("2026-06-23T10:00:00.000Z");

function daysAgo(n: number) {
  return new Date(NOW - n * 86_400_000).toISOString();
}

describe("followup engine", () => {
  it("returns wait when lead was contacted recently", () => {
    const result = evaluateFollowupLead(
      {
        id: "lead-1",
        name: "Anna",
        email: "anna@example.com",
        status: "Nový",
        last_contact: daysAgo(1),
      },
      { nowMs: NOW },
    );
    expect(result.draft?.decision).toBe("wait");
    expect(result.prediction).toBeNull();
  });

  it("proposes email draft for stale lead with email", () => {
    const result = evaluateFollowupLead(
      {
        id: "lead-2",
        name: "Peter",
        email: "peter@example.com",
        status: "Teplý",
        last_contact: daysAgo(8),
      },
      { nowMs: NOW },
    );
    expect(result.draft?.decision).toBe("follow_up_email");
    expect(result.draft?.channel).toBe("email");
    expect(result.draft?.body).toContain("Reality Smolko");
    expect(result.prediction?.decision).toBe("follow_up_email");
  });

  it("routes missing contact to broker_review", () => {
    const result = evaluateFollowupLead(
      {
        id: "lead-3",
        name: "No Contact",
        status: "Nový",
        last_contact: daysAgo(10),
      },
      { nowMs: NOW },
    );
    expect(result.draft?.decision).toBe("broker_review");
    expect(result.prediction).toBeNull();
  });

  it("prefers sms when only phone is available", () => {
    const result = evaluateFollowupLead(
      {
        id: "lead-4",
        name: "Mobil",
        phone: "+421900000000",
        status: "Horúci",
        last_contact: daysAgo(12),
      },
      { nowMs: NOW },
    );
    expect(result.draft?.decision).toBe("follow_up_sms");
    expect(result.draft?.channel).toBe("sms");
  });
});
