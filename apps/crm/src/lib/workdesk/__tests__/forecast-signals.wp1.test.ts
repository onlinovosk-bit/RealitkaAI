import { describe, expect, it } from "vitest";
import { buildForecastRiskSummary } from "@/lib/workdesk/forecast-signals";

const base = {
  leadId: "x",
  leadName: "Lead",
  kind: "high_value_no_tasks" as const,
  probabilityPercent: 50,
  openTasks: 0,
  overdueOpenTasks: 0,
  note: "Ponuka bez follow-upu",
};

describe("WP-1 forecast-signals: riziko z reálnej hodnoty dealu", () => {
  it("bez rozpočtu je riziko nevypočítané (nie 50 % z 180000)", () => {
    const s = buildForecastRiskSummary({
      totalLeads: 5,
      expectedPipelineValue: 0,
      expectedClosedDeals: 0,
      dealHealth: [{ ...base, expectedDealValueEur: null }],
    });
    expect(s.signals[0].riskKnown).toBe(false);
    expect(s.signals[0].riskEur).toBe(0);
    expect(s.signals[0].riskEur).not.toBe(90000);
    expect(s.signals[0].note).toContain("nevypočítané");
    expect(s.atRiskValueEur).toBe(0);
    expect(s.unknownValueCount).toBe(1);
  });

  it("chýbajúce pole hodnoty (staré dáta) sa tiež berie ako nevypočítané", () => {
    const s = buildForecastRiskSummary({
      totalLeads: 5,
      expectedPipelineValue: 0,
      expectedClosedDeals: 0,
      dealHealth: [base],
    });
    expect(s.signals[0].riskKnown).toBe(false);
    expect(s.signals[0].riskEur).toBe(0);
  });

  it("so známou hodnotou počíta pravdepodobnosť x reálna hodnota", () => {
    const s = buildForecastRiskSummary({
      totalLeads: 5,
      expectedPipelineValue: 0,
      expectedClosedDeals: 0,
      dealHealth: [{ ...base, expectedDealValueEur: 100000 }],
    });
    expect(s.signals[0].riskKnown).toBe(true);
    expect(s.signals[0].riskEur).toBe(50000);
    expect(s.atRiskValueEur).toBe(50000);
    expect(s.unknownValueCount).toBe(0);
  });
});
