import { describe, expect, it, beforeEach } from "vitest";
import { REALVIA_SMOLKO_13303557 } from "@/lib/capabilities/_shared/fixtures/realvia-smolko-13303557";
import { clearCapabilityAuditForTests } from "@/lib/capabilities/_shared/audit-log";
import { scoreListingCompleteness } from "@/lib/capabilities/listing-score";

const AGENCY = "11111111-1111-1111-1111-111111111111";

describe("listing-score scoreListingCompleteness", () => {
  beforeEach(() => clearCapabilityAuditForTests());

  it("scores real Smolko fixture 13303557 from actual fields only", () => {
    const result = scoreListingCompleteness({
      agencyId: AGENCY,
      property: REALVIA_SMOLKO_13303557,
    });

    expect(result.sourceId).toBe("13303557");
    expect(result.totalCount).toBe(9);
    expect(result.filledCount).toBe(4);
    expect(result.scorePercent).toBe(44);
    expect(result.missing).toEqual(
      expect.arrayContaining(["video", "virtuálna prehliadka", "cena", "gps", "energetický certifikát"]),
    );
    expect(result.fields.find((f) => f.key === "price")?.present).toBe(false);
    expect(result.fields.find((f) => f.key === "photos")?.present).toBe(true);
    expect(result.guardian.verdict).toBe("pass");
    expect(result.guardian.blockedPublish).toBe(false);
    expect(result.summary).toContain("44%");
  });

  it("HTML in description is stripped before length check", () => {
    // Short visible text padded with HTML tags — score should use plain text length
    const htmlDescription = "<p>Krátky.</p>" + "<br />".repeat(50);
    const result = scoreListingCompleteness({
      agencyId: AGENCY,
      property: { ...REALVIA_SMOLKO_13303557, description: htmlDescription },
    });
    // Plain text is "Krátky." (7 chars) — below MIN_DESCRIPTION_LENGTH (40)
    expect(result.fields.find((f) => f.key === "description")?.present).toBe(false);
  });

  it("missing GPS — gps field not present in score", () => {
    const result = scoreListingCompleteness({
      agencyId: AGENCY,
      property: { ...REALVIA_SMOLKO_13303557, latitude: null, longitude: null },
    });
    expect(result.fields.find((f) => f.key === "gps")?.present).toBe(false);
    expect(result.missing).toContain("gps");
  });

  it("missing price (null) — price field not present", () => {
    const result = scoreListingCompleteness({
      agencyId: AGENCY,
      property: { ...REALVIA_SMOLKO_13303557, price: null },
    });
    expect(result.fields.find((f) => f.key === "price")?.present).toBe(false);
  });
});
