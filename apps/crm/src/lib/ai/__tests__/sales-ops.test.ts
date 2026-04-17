import { describe, expect, it } from "vitest";
import { getDealProbability } from "../probability";
import { calculateMonthlyMoneyForecast, calculateTrend } from "../forecast-money";
import { getAutopilotActions } from "../autopilot-rules";
import type { AISalesBrainProfile } from "../sales-brain";

describe("probability", () => {
  it("getDealProbability matches tiers", () => {
    expect(getDealProbability(85)).toBe(0.7);
    expect(getDealProbability(65)).toBe(0.4);
    expect(getDealProbability(45)).toBe(0.2);
    expect(getDealProbability(20)).toBe(0.05);
  });
});

describe("forecast money", () => {
  it("sums expected EUR", () => {
    const leads = [
      {
        id: "a",
        name: "A",
        budget: "200 000",
        score: 90,
        email: "",
        phone: "",
        location: "",
        propertyType: "",
        rooms: "",
        financing: "",
        timeline: "",
        source: "",
        status: "Horúci" as const,
        assignedAgent: "",
        lastContact: "",
        note: "",
      },
    ];
    const f = calculateMonthlyMoneyForecast(leads);
    expect(f.totalExpectedEur).toBe(Math.round(200_000 * 0.7));
  });

  it("calculateTrend", () => {
    expect(calculateTrend(120, 100)).toEqual({ diff: 20, percent: 20 });
    expect(calculateTrend(100, 0).percent).toBe(100);
  });
});

describe("autopilot rules", () => {
  it("returns actions for hot profile", () => {
    const profile = {
      engineVersion: "v2" as const,
      score: 85,
      legacyScore: 80,
      multiModelScore: 80,
      weightedSignalScore: 80,
      confidence: 75,
      confidenceTier: "vysoká" as const,
      timeToCloseDays: 5,
      timeToCloseHint: "",
      breakdown: { engagement: 0, intent: 0, timing: 0, behavioral: 0 },
      breakdownLabels: {
        engagement: "",
        intent: "",
        timing: "",
        behavioral: "",
      },
      explainability: [],
      nextBestAction: "",
      selfLearning: { outcomeSamples: 0, note: "" },
    } satisfies AISalesBrainProfile;

    const actions = getAutopilotActions(profile);
    expect(actions.some((a) => a.type === "call")).toBe(true);
    expect(actions.some((a) => a.type === "urgent_followup")).toBe(true);
  });
});
