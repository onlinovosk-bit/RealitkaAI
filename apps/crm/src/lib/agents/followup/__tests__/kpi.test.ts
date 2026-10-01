import { describe, expect, it } from "vitest";
import { computeContactedWithin24hPercent } from "@/lib/agents/followup/kpi";

const NOW = Date.parse("2026-06-23T10:00:00.000Z");

describe("followup kpi", () => {
  it("computes percent contacted within 24h of creation", () => {
    const created = new Date(NOW - 48 * 60 * 60 * 1000).toISOString();
    const within = new Date(NOW - 47 * 60 * 60 * 1000).toISOString();
    const late = new Date(NOW - 23 * 60 * 60 * 1000).toISOString();

    const kpi = computeContactedWithin24hPercent(
      [
        { id: "1", created_at: created, last_contact: within },
        { id: "2", created_at: created, last_contact: late },
        { id: "3", created_at: created, last_contact: null },
      ],
      NOW,
    );

    expect(kpi.totalLeads).toBe(3);
    expect(kpi.contactedWithin24h).toBe(1);
    expect(kpi.percentWithin24h).toBe(33.3);
  });
});
