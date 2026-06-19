import { describe, expect, it, beforeEach } from "vitest";
import { REALVIA_SMOLKO_13303557 } from "@/lib/capabilities/_shared/fixtures/realvia-smolko-13303557";
import { buildPropertyMicrosite } from "@/lib/capabilities/property-microsite";
import { clearCapabilityAuditForTests } from "@/lib/capabilities/_shared/audit-log";

const AGENCY = "11111111-1111-1111-1111-111111111111";

describe("property-microsite buildPropertyMicrosite", () => {
  beforeEach(() => clearCapabilityAuditForTests());

  it("builds from real Realvia fixture source_id=13303557", () => {
    const spec = buildPropertyMicrosite({
      agencyId: AGENCY,
      property: REALVIA_SMOLKO_13303557,
    });

    expect(spec.sourceId).toBe("13303557");
    expect(spec.heroTitle).toContain("Modrá");
    expect(spec.noindex).toBe(true);
    expect(spec.publishBlocked).toBe(true);
    expect(spec.imageUrls.length).toBeGreaterThan(0);
    expect(spec.guardianPass).toBe(true);
  });
});
