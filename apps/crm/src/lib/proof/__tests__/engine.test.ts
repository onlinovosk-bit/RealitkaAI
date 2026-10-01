import { describe, expect, it } from "vitest";
import { computeLeakModel, computeProofReport, estimateLeadsWithoutFollowUp } from "../engine";
import { PROOF_BENCHMARKS } from "../constants";

describe("proof engine", () => {
  it("computeLeakModel matches landing defaults (80 leads, 120 min, 8%)", () => {
    const result = computeLeakModel({
      leadsPerMonth: 80,
      responseMinutes: 120,
      dealRatePercent: 8,
    });
    expect(result.monthlyLeakEur).toBe(6528);
    expect(result.recoveredEur).toBe(1436);
    expect(result.projectedDeals).toBe(7);
  });

  it("estimateLeadsWithoutFollowUp", () => {
    expect(estimateLeadsWithoutFollowUp(80, 50)).toBe(40);
    expect(estimateLeadsWithoutFollowUp(100, 100)).toBe(0);
  });

  it("computeProofReport returns bounded health score and honest disclaimer", () => {
    const report = computeProofReport({
      agentsCount: 5,
      leadsPerMonth: 80,
      responseMinutes: 180,
      dealRatePercent: 8,
      followUpRatePercent: 45,
      name: "Test Owner",
      email: "owner@rk.sk",
      company: "Test RK",
      gdprConsent: true,
    });
    expect(report.revenueHealthScore).toBeGreaterThanOrEqual(0);
    expect(report.revenueHealthScore).toBeLessThanOrEqual(100);
    expect(report.disclaimer).toContain("benchmarky");
    expect(report.metrics.some((m) => m.id === "no-follow-up")).toBe(true);
    expect(report.risks.length).toBeGreaterThan(0);
  });

  it("exports shared benchmark constants", () => {
    expect(PROOF_BENCHMARKS.avgRevenuePerDeal).toBe(2400);
  });
});
