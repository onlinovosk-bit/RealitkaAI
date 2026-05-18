import { describe, expect, it } from "vitest";

import {
  TRIAGE_FALLBACK_WEIGHTS,
  buildTriageAiCompactRow,
  triageBudgetScore,
  triageCompositeToPriority,
  triageFallbackPriority,
  triageLastActivityScore,
  triageUrgencyScore,
} from "@/ai/triage-fallback-scoring";

describe("TRIAGE_FALLBACK_WEIGHTS", () => {
  it("sums to 1", () => {
    expect(
      TRIAGE_FALLBACK_WEIGHTS.urgency +
        TRIAGE_FALLBACK_WEIGHTS.budget +
        TRIAGE_FALLBACK_WEIGHTS.activity,
    ).toBeCloseTo(1, 5);
  });
});

describe("triageCompositeToPriority", () => {
  it("maps tertiles", () => {
    expect(triageCompositeToPriority(0.9)).toBe("Vysoká");
    expect(triageCompositeToPriority(0.5)).toBe("Stredná");
    expect(triageCompositeToPriority(0.1)).toBe("Nízka");
  });
});

describe("triageFallbackPriority", () => {
  it("produces weighted composite and reason", () => {
    const r = triageFallbackPriority({
      status: "Horúci",
      score: 90,
      budget: "400 000 €",
      last_contact: new Date().toISOString(),
    });
    expect(r.priority).toBe("Vysoká");
    expect(r.reason).toContain("Fallback skóre");
    expect(r.breakdown.composite).toBeGreaterThan(2 / 3);
  });

  it("handles horúci with low budget", () => {
    const r = triageFallbackPriority({
      status: "Teplý",
      score: 30,
      budget: "",
      last_contact: null,
    });
    expect(["Stredná", "Nízka"]).toContain(r.priority);
  });
});

describe("triageUrgencyScore", () => {
  it("is within 0..1", () => {
    expect(triageUrgencyScore("Horúci", 100)).toBeLessThanOrEqual(1);
    expect(triageUrgencyScore("X", 0)).toBeGreaterThanOrEqual(0);
  });
});

describe("triageBudgetScore", () => {
  it("parses thousands", () => {
    expect(triageBudgetScore("350k €")).toBeGreaterThan(0.5);
  });
});

describe("triageLastActivityScore", () => {
  it("scores recent ISO high", () => {
    const iso = new Date().toISOString();
    expect(triageLastActivityScore(iso)).toBeGreaterThan(0.9);
  });
});

describe("triage compact row", () => {
  it("uses only numeric signals and slugs", () => {
    const row = buildTriageAiCompactRow({
      id: "x-1",
      status: "Obhliadka",
      score: 80,
      budget: "350000",
      last_contact: new Date().toISOString(),
      note: "Krátka.",
      source: "web",
    });
    expect(row.id).toBe("x-1");
    expect(row.urgency).toBeGreaterThanOrEqual(1);
    expect(row.urgency).toBeLessThanOrEqual(10);
    expect(row.budget).toBeGreaterThanOrEqual(1);
    expect(row.stage).toBe("viewing");
    expect(row.last_activity_days).toBe(0);
    expect(row.interactions).toBeGreaterThanOrEqual(1);
  });
});
