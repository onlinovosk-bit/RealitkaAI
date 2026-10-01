import { describe, expect, it } from "vitest";
import { buildValuationLeadInsert, CONSENT_VERSION } from "@/lib/valuation/lead-mapper";

const AGENCY = "11111111-1111-1111-1111-111111111111";

describe("buildValuationLeadInsert", () => {
  it("stores GDPR consent columns and version", () => {
    const row = buildValuationLeadInsert(AGENCY, {
      agencySlug: "reality-smolko",
      propertyType: "byt",
      location: "Košice",
      sqm: 75,
      name: "Test User",
      email: "test@example.com",
      phone: "0900123456",
      sellWithin12Months: false,
      privacyAck: true,
    });
    expect(row.gdpr_consent_version).toBe(CONSENT_VERSION);
    expect(row.gdpr_consent_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("stores owner price expectation in note only, not budget band", () => {
    const row = buildValuationLeadInsert(AGENCY, {
      agencySlug: "reality-smolko",
      propertyType: "byt",
      location: "Košice",
      sqm: 75,
      name: "Test User",
      email: "test@example.com",
      phone: "0900123456",
      sellWithin12Months: false,
      privacyAck: true,
      ownerPriceExpectation: 280_000,
      estimate: {
        noEstimate: false,
        low: 220_000,
        high: 270_000,
        currency: "EUR",
        commentary: "test",
        disclaimer: "test",
      },
    });
    expect(row.note).toContain("majitel_cena=280000EUR");
    expect(row.budget).toBe("220000-270000 EUR");
  });
});
