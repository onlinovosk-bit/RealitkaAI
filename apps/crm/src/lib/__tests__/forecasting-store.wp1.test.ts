import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/leads-store", () => ({
  listLeads: async () => [
    { id: "l1", name: "Bez rozpočtu", status: "Ponuka", budget: "", score: 80, source: "web" },
    { id: "l2", name: "S rozpočtom", status: "Ponuka", budget: "200 000 €", score: 80, source: "web" },
  ],
}));
vi.mock("@/lib/tasks-store", () => ({ listTasks: async () => [] }));
vi.mock("@/lib/matching-store", () => ({ listPersistedMatches: async () => [] }));
vi.mock("@/lib/recommendations-store", () => ({ listRecommendations: async () => [] }));
vi.mock("@/lib/ai-scoring-store", () => ({ calculateAllLeadScores: async () => [] }));

import { getForecastingData } from "@/lib/forecasting-store";

describe("WP-1 forecasting-store: chýbajúci rozpočet = nevypočítané, nie 180000", () => {
  it("lead bez rozpočtu nemá vymyslenú hodnotu ani vážené eurá", async () => {
    const data = await getForecastingData();
    const row = data.topForecastLeads.find((r) => r.leadId === "l1")!;
    expect(row.budgetKnown).toBe(false);
    expect(row.expectedDealValue).toBe(0);
    expect(row.weightedValue).toBe(0);
    expect(row.expectedDealValue).not.toBe(180000);
  });

  it("pipeline KPI počíta len reálne rozpočty a hlási počet leadov bez rozpočtu", async () => {
    const data = await getForecastingData();
    const known = data.topForecastLeads.find((r) => r.leadId === "l2")!;
    expect(known.budgetKnown).toBe(true);
    expect(known.expectedDealValue).toBe(200000);
    expect(data.kpis.expectedPipelineValue).toBe(Math.round(known.weightedValue));
    expect(data.kpis.leadsWithoutBudget).toBe(1);
  });

  it("dealHealth nesie null hodnotu pre lead bez rozpočtu", async () => {
    const data = await getForecastingData();
    const h = data.dealHealth.find((d) => d.leadId === "l1");
    expect(h?.expectedDealValueEur).toBeNull();
    expect(data.dealHealth.find((d) => d.leadId === "l2")?.expectedDealValueEur).toBe(200000);
  });
});
