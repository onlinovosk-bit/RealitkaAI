import { describe, expect, it } from "vitest";
import { buildDeliveryFallbackText } from "@/lib/morning-brief/generators/ai-text";
import type { GatheredData } from "@/lib/morning-brief/gather";

function minimalGathered(overrides: Partial<GatheredData["stats"]> = {}): GatheredData {
  return {
    settings: {
      profile_id: "p-1",
      channels: ["email"],
      a_b_variant: "A",
      lead_count: 5,
      enabled: true,
    } as GatheredData["settings"],
    ownerName: "Maklér Test",
    ownerEmail: "makler@test.sk",
    hotLeads: [],
    overnight: {
      newLeads: 2,
      lvChanges: [],
      arbitrage: [],
      priceDrops: [],
      replies: [],
    },
    stats: {
      hotLeads: 1,
      activeLeads: 8,
      newInquiries: 2,
      scoreIncreases: 0,
      weeklyRevForecast: null,
      pendingContact: 4,
      hotPending: 2,
      staleContacts48h: 1,
      pipelineValueEur: 420_000,
      priorityLeadNames: ["Ján Novák"],
      priceDropCount: 0,
      ...overrides,
    },
  };
}

describe("[verification] Morning Brief backend", () => {
  it("builds deterministic delivery fallback when AI text is empty", () => {
    const text = buildDeliveryFallbackText(minimalGathered(), 2);
    expect(text).toContain("2 HOT leadov");
    expect(text).toContain("48h");
    expect(text).toContain("/leads");
  });

  it("includes stale contact count from gathered stats", () => {
    const text = buildDeliveryFallbackText(minimalGathered({ staleContacts48h: 5 }), 0);
    expect(text).toContain("5");
  });
});
