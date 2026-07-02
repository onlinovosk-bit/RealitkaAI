import { describe, expect, it } from "vitest";
import {
  REVENUE_TILE_REGISTRY,
  countLeadsBySource,
  getActionQueueLeads,
} from "@/lib/modules/revenue-intelligence";

describe("revenue intelligence registry", () => {
  it("defines all tiles with allowed statuses only", () => {
    for (const tile of Object.values(REVENUE_TILE_REGISTRY)) {
      expect(["live", "pending", "hidden"]).toContain(tile.status);
    }
  });

  it("marks currently wired tiles as live and keeps weak-signal tiles pending", () => {
    expect(REVENUE_TILE_REGISTRY.action_queue.status).toBe("live");
    expect(REVENUE_TILE_REGISTRY.leads_by_source.status).toBe("live");
    expect(REVENUE_TILE_REGISTRY.kataster_context.status).toBe("live");
    expect(REVENUE_TILE_REGISTRY.ai_priority_strip.status).toBe("pending");
  });

  it("marks unsupported synthetic metrics as hidden", () => {
    expect(REVENUE_TILE_REGISTRY.neural_prediction_accuracy.status).toBe("hidden");
    expect(REVENUE_TILE_REGISTRY.live_market_pulse.status).toBe("hidden");
  });
});

describe("revenue intelligence data wiring", () => {
  it("Action Queue returns only new leads sorted oldest first", () => {
    const queue = getActionQueueLeads([
      { id: "a", status: "new", source: "Realvia", createdAt: "2026-06-12T10:00:00.000Z" },
      { id: "b", status: "Teplý", source: "Manual", createdAt: "2026-06-11T10:00:00.000Z" },
      { id: "c", status: "Nový", source: "Realvia", createdAt: "2026-06-10T10:00:00.000Z" },
    ] as any);

    expect(queue.map((lead) => lead.id)).toEqual(["c", "a"]);
  });

  it("groups leads by source for live source tile", () => {
    const grouped = countLeadsBySource([
      { source: "Realvia" },
      { source: "Realvia" },
      { source: "Manual" },
      { source: "" },
    ] as any);

    expect(grouped).toEqual([
      { source: "Realvia", count: 2 },
      { source: "Manual", count: 1 },
      { source: "Neznámy zdroj", count: 1 },
    ]);
  });

});
