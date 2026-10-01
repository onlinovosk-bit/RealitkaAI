import { describe, expect, it } from "vitest";
import {
  aiCostDailyCsv,
  founderMetricsSummaryCsv,
  metricsTrendsCsv,
} from "../csv";
import { computeFounderMetrics } from "../compute";
import { METRICS_FIXTURE_AGENCIES, METRICS_FIXTURE_LEDGER } from "./fixtures";

describe("founder metrics csv export", () => {
  const snapshot = computeFounderMetrics({
    agencies: METRICS_FIXTURE_AGENCIES,
    ledger: METRICS_FIXTURE_LEDGER,
    aiCostDaily: [
      {
        day_utc: "2026-06-10",
        credits_spent: 20,
        cost_eur: 4.5,
        revenue_eur_retail: 17.2,
        margin_eur: 12.7,
      },
    ],
    aiCostDailyAvailable: true,
    asOf: new Date("2026-06-15T12:00:00.000Z"),
  });

  it("exports summary as single data row", () => {
    const csv = founderMetricsSummaryCsv(snapshot);
    const lines = csv.split("\n");
    expect(lines[0]).toContain("mrr_total_eur");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('"2026-06"');
  });

  it("exports ai_cost_daily rows", () => {
    const csv = aiCostDailyCsv(snapshot.aiCostDailySeries);
    expect(csv).toContain("day_utc");
    expect(csv).toContain("2026-06-10");
    expect(csv).toContain("4.5");
  });

  it("exports 4-week trend matrix", () => {
    const csv = metricsTrendsCsv(snapshot.trends);
    expect(csv).toContain("week_1");
    expect(csv).toContain("credits_granted");
    expect(csv).toContain("ai_cost_eur");
  });
});
