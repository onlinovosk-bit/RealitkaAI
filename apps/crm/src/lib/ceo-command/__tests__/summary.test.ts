import { describe, expect, it } from "vitest";
import { buildCeoCommandSummary } from "@/lib/ceo-command/summary";

const NOW = Date.parse("2026-06-16T09:00:00.000Z");

function hoursAgo(h: number) {
  return new Date(NOW - h * 60 * 60 * 1000).toISOString();
}

describe("ceo command summary", () => {
  it("computes live sections from own data only", () => {
    const summary = buildCeoCommandSummary({
      nowMs: NOW,
      leads: [
        { source: "Web formulár", status: "Nový", last_contact: null, created_at: hoursAgo(2) },
        { source: "Web formulár", status: "Teplý", last_contact: "Bez kontaktu", created_at: hoursAgo(50) },
        { source: "Portál", status: "Horúci", last_contact: hoursAgo(8), created_at: hoursAgo(8) },
      ],
      sellerRescueNotifications: [
        { priority: "critical", read_at: null, created_at: hoursAgo(4) },
      ],
    });

    const live = summary.sections.filter((s) => s.status === "live");
    expect(live.find((s) => s.id === "new_leads")?.value).toBe("2");
    expect(live.find((s) => s.id === "lead_source")?.value).toContain("Web formulár");
    expect(live.find((s) => s.id === "uncontacted")?.value).toBe("2");
    expect(live.find((s) => s.id === "rescue_urgent")?.value).toBe("1");
  });

  it("returns honest recommendation when no urgent live signal exists", () => {
    const summary = buildCeoCommandSummary({
      nowMs: NOW,
      leads: [],
      sellerRescueNotifications: [],
    });
    expect(summary.recommendations).toHaveLength(1);
    expect(summary.recommendations[0]).toContain("nie je urgentná CEO akcia");
  });
});

