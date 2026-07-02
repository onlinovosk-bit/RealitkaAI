import { describe, expect, it } from "vitest";
import { mapStealthProspectRow, type StealthProspectRow } from "./store";

describe("stealth-recruiter store mapping", () => {
  it("maps DB row to UI prospect with metadata fallbacks", () => {
    const row: StealthProspectRow = {
      id: "p-1",
      agency_id: "agency-1",
      profile_id: "profile-1",
      address: "Test 1, Bratislava",
      source: "bazos",
      score: 88,
      status: "outreached",
      outreach_message: "Ahoj, pomôžem s predajom.",
      metadata: {
        platform: "bazos",
        daysListed: 120,
        originalPrice: 200000,
        currentPrice: 180000,
      },
      created_at: "2026-05-27T10:00:00Z",
      updated_at: "2026-05-27T11:00:00Z",
    };

    const mapped = mapStealthProspectRow(row);
    expect(mapped.id).toBe("p-1");
    expect(mapped.platform).toBe("bazos");
    expect(mapped.daysListed).toBe(120);
    expect(mapped.priceDropPercent).toBe(10);
    expect(mapped.aiOutreach).toBe("Ahoj, pomôžem s predajom.");
    expect(mapped.status).toBe("outreached");
  });

  it("derives price drop when metadata omits explicit percent", () => {
    const row: StealthProspectRow = {
      id: "p-2",
      agency_id: "agency-1",
      profile_id: null,
      address: "Test 2",
      source: "other",
      score: 70,
      status: "identified",
      outreach_message: null,
      metadata: { original_price: 100000, current_price: 90000, days_listed: 30 },
      created_at: "2026-05-27T10:00:00Z",
      updated_at: "2026-05-27T10:00:00Z",
    };

    const mapped = mapStealthProspectRow(row);
    expect(mapped.priceDropPercent).toBe(10);
    expect(mapped.daysListed).toBe(30);
  });
});
