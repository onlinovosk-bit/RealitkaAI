import { describe, expect, it } from "vitest";
import { analyzeCall } from "../call-analysis";
import { generateCallCoaching } from "../call-coach";
import {
  type DealStrategyInput,
  generateDealStrategy,
  prioritizeSteps,
  strategyCloseProbability,
} from "../deal-strategy";

describe("analyzeCall + coaching", () => {
  it("scores and flags missing next step", () => {
    const t =
      "Ďakujem za záujem. Cena je v poriadku. Môžeme sa ešte ozvať.";
    const a = analyzeCall(t);
    expect(a.strengths.some((s) => s.includes("komunik"))).toBe(true);
    expect(a.weaknesses.some((w) => w.includes("krok"))).toBe(true);
    const c = generateCallCoaching(a);
    expect(c.tip.length).toBeGreaterThan(0);
    expect(c.nextStep.length).toBeGreaterThan(0);
  });
});

describe("deal strategy", () => {
  it("returns prioritized steps and probability in 0–100", () => {
    const input: DealStrategyInput = {
      score: 85,
      status: "Obhliadka",
      note: "chce obhliadku zajtra",
      timeToCloseDays: 5,
    };

    const steps = generateDealStrategy(input);
    const top = prioritizeSteps(steps, 3);
    expect(top.length).toBeLessThanOrEqual(3);
    const p = strategyCloseProbability(input);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(100);
  });
});
