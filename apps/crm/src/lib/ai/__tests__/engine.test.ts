import { describe, it, expect } from "vitest";

import {
  buildDNA,
  calculateRisk,
  combineRiskScore,
  detectMoment,
  generateAction,
  processLead,
} from "@/lib/ai/engine";

describe("sales intelligence engine", () => {
  it("processLead: otvorenia a kliky zvyšujú skóre", () => {
    const events = [
      { type: "email_open", created_at: new Date().toISOString() },
      { type: "click", created_at: new Date().toISOString() },
    ];
    const { score, inactivityRiskBoost } = processLead({}, events);
    expect(score).toBe(5 + 10);
    expect(inactivityRiskBoost).toBe(0);
  });

  it("processLead: bez otvorenia emailu zvýši rizikový boost", () => {
    const events = [{ type: "call", created_at: new Date().toISOString() }];
    const { inactivityRiskBoost } = processLead({}, events);
    expect(inactivityRiskBoost).toBe(40);
  });

  it("calculateRisk: bez udalostí vysoké riziko", () => {
    expect(calculateRisk([])).toBe(80);
  });

  it("calculateRisk: stará aktivita zvyšuje riziko", () => {
    const old = new Date(Date.now() - 8 * 86400000).toISOString();
    expect(calculateRisk([{ type: "click", created_at: old }])).toBe(70);
  });

  it("detectMoment: klik v posledných troch = hot", () => {
    const now = new Date().toISOString();
    expect(
      detectMoment([
        { type: "email_open", created_at: now },
        { type: "click", created_at: now },
      ])
    ).toBe(true);
  });

  it("buildDNA: veľa klikov = analytický", () => {
    const events = Array.from({ length: 6 }, (_, i) => ({
      type: "click",
      created_at: new Date(Date.now() + i).toISOString(),
    }));
    const dna = buildDNA(events);
    expect(dna.type).toBe("analytický");
  });

  it("generateAction: hot + skóre → hovor", () => {
    const a = generateAction({}, 60, 20, true);
    expect(a.action).toContain("Zavolaj");
  });

  it("generateAction: vysoké riziko → reaktivácia", () => {
    const a = generateAction({}, 10, 70, false);
    expect(a.action).toContain("Reaktivuj");
  });

  it("combineRiskScore: clamp 0–100", () => {
    expect(combineRiskScore(90, 50)).toBe(90);
    expect(combineRiskScore(20, 40)).toBe(40);
  });
});
