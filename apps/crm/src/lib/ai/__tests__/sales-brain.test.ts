import { describe, expect, it } from "vitest";
import { calculateConfidence } from "../confidence";
import { calculateMultiModelScore } from "../multi-model";
import { predictTimeToClose } from "../time-to-close";
import { generateAISalesBrainProfile } from "../sales-brain";
import type { SalesBrainSignals } from "../signals";

const baseSignals: SalesBrainSignals = {
  emailOpened: 2,
  emailClicked: 1,
  propertyViews: 4,
  responded: true,
  scheduledViewing: true,
  daysSinceLastContact: 1,
};

describe("AI Sales Brain v2", () => {
  it("calculateConfidence returns 0–100", () => {
    const c = calculateConfidence(baseSignals);
    expect(c).toBeGreaterThanOrEqual(0);
    expect(c).toBeLessThanOrEqual(100);
  });

  it("calculateMultiModelScore matches segment formula", () => {
    const s: SalesBrainSignals = {
      emailOpened: 2,
      emailClicked: 1,
      propertyViews: 3,
      responded: true,
      scheduledViewing: false,
      daysSinceLastContact: 1,
    };
    const engagement = 2 * 2 + 1 * 3;
    const intent = 3 * 2 + 10;
    const timing = 10;
    const behavioral = 0;
    expect(calculateMultiModelScore(s)).toBe(Math.min(100, engagement + intent + timing + behavioral));
  });

  it("predictTimeToClose is at least 1 day", () => {
    expect(predictTimeToClose(baseSignals)).toBeGreaterThanOrEqual(1);
  });

  it("generateAISalesBrainProfile produces v2 profile", () => {
    const profile = generateAISalesBrainProfile({
      lead: {
        id: "x",
        name: "Test",
        location: "",
        budget: "200000",
        propertyType: "",
        rooms: "",
        financing: "hotovosť",
        timeline: "ihneď",
        status: "Horúci",
        note: "Dlhá poznámka pre kvalifikáciu testu.",
        source: "web",
        assignedAgent: "",
        lastContact: new Date().toISOString(),
      },
      matches: [{ leadId: "x", matchScore: 88 }],
      recommendations: [{ leadId: "x", priority: "high" }],
      tasks: [{ leadId: "x", status: "open", priority: "high" }],
      messages: [{ leadId: "x", direction: "inbound", body: "ďakujem" }],
    });

    expect(profile.engineVersion).toBe("v2");
    expect(profile.score).toBeGreaterThanOrEqual(0);
    expect(profile.score).toBeLessThanOrEqual(100);
    expect(profile.explainability.length).toBeGreaterThan(0);
  });
});
