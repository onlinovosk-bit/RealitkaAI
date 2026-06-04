import { describe, expect, it } from "vitest";
import { buildForecastRiskSummary } from "@/lib/workdesk/forecast-signals";

describe("buildForecastRiskSummary", () => {
  it("returns honest empty state when there are no leads (no fake gap headline)", () => {
    const summary = buildForecastRiskSummary({
      totalLeads: 0,
      expectedPipelineValue: 0,
      expectedClosedDeals: 0,
      dealHealth: [],
    });

    expect(summary.headline).toBe("Zatiaľ nie sú dáta na predikciu rizika");
    expect(summary.signals).toHaveLength(0);
    expect(summary.gapEur).toBe(0);
    expect(JSON.stringify(summary)).not.toMatch(/Kováč|Poláková|demo/i);
  });

  it("maps real deal health issues without demo names", () => {
    const summary = buildForecastRiskSummary({
      totalLeads: 12,
      expectedPipelineValue: 120000,
      expectedClosedDeals: 1,
      dealHealth: [
        {
          leadId: "lead-abc",
          leadName: "Adamovičová Jana",
          kind: "high_value_no_tasks",
          probabilityPercent: 65,
          openTasks: 0,
          overdueOpenTasks: 0,
          note: "Ponuka bez follow-upu",
        },
      ],
    });

    expect(summary.signals).toHaveLength(1);
    expect(summary.signals[0]?.leadName).toBe("Adamovičová Jana");
    expect(summary.signals[0]?.leadId).toBe("lead-abc");
    expect(JSON.stringify(summary)).not.toMatch(/Kováč|Poláková|demo/i);
  });
});
