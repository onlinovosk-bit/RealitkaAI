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
});
