import { describe, expect, it } from "vitest";
import { computeFourWeekTrends } from "../compute";
import { aggregateAiCostWeek, fourWeekBuckets, TREND_WEEK_COUNT } from "../trends";
import { METRICS_FIXTURE_AGENCIES, METRICS_FIXTURE_LEDGER } from "./fixtures";

describe("founder metrics trends", () => {
  it("builds four UTC week buckets", () => {
    const buckets = fourWeekBuckets(new Date("2026-06-15T12:00:00.000Z"));
    expect(buckets).toHaveLength(TREND_WEEK_COUNT);
    expect(buckets[0]!.label).toBe("2026-05-25");
    expect(buckets[3]!.label).toBe("2026-06-15");
  });

  it("aggregates ai_cost_daily rows per week", () => {
    const start = new Date("2026-06-09T00:00:00.000Z");
    const end = new Date("2026-06-16T00:00:00.000Z");
    const agg = aggregateAiCostWeek(
      [
        {
          day_utc: "2026-06-10",
          credits_spent: 10,
          cost_eur: 2,
          revenue_eur_retail: 8.6,
          margin_eur: 6.6,
        },
        {
          day_utc: "2026-06-11",
          credits_spent: 5,
          cost_eur: 1,
          revenue_eur_retail: 4.3,
          margin_eur: 3.3,
        },
      ],
      start,
      end,
    );
    expect(agg.creditsSpent).toBe(15);
    expect(agg.costEur).toBe(3);
    expect(agg.marginEur).toBe(9.9);
  });

  it("computes 4-week credit and AI trend series", () => {
    const trends = computeFourWeekTrends({
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

    expect(trends).toHaveLength(8);
    const granted = trends.find((t) => t.metric === "credits_granted");
    expect(granted?.values).toHaveLength(4);
    expect(granted?.values[1]).toBe(100);

    const aiCost = trends.find((t) => t.metric === "ai_cost_eur");
    expect(aiCost?.values[2]).toBe(4.5);

    const mrr = trends.find((t) => t.metric === "mrr_total_eur");
    expect(mrr?.values.slice(0, 3)).toEqual([null, null, null]);
    expect(mrr?.values[3]).toBeGreaterThan(0);
  });
});
