import { describe, expect, it, beforeEach } from "vitest";
import { REALVIA_SMOLKO_13303557 } from "@/lib/capabilities/_shared/fixtures/realvia-smolko-13303557";
import { buildPropertyMicrosite, micrositeGuardianCheck } from "@/lib/capabilities/property-microsite";
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

  it("HTML in description — body contains no HTML tags", () => {
    const spec = buildPropertyMicrosite({
      agencyId: AGENCY,
      property: {
        ...REALVIA_SMOLKO_13303557,
        description: "Novostavba <b>RD</b> v obci <em>Modrá</em>.",
      },
    });
    expect(spec.body).not.toMatch(/<[^>]+>/);
    expect(spec.guardianPass).toBe(true);
  });

  it("no images — imageUrls is empty array", () => {
    const spec = buildPropertyMicrosite({
      agencyId: AGENCY,
      property: { ...REALVIA_SMOLKO_13303557, images: [] },
    });
    expect(spec.imageUrls).toHaveLength(0);
  });

  it("micrositeGuardianCheck — PASS when headline/body use real title", () => {
    const result = micrositeGuardianCheck(
      AGENCY,
      REALVIA_SMOLKO_13303557,
      REALVIA_SMOLKO_13303557.title,
      "Lokalita: Školská, Modrá nad Cirochou.",
    );
    expect(result.verdict).toBe("pass");
    expect(result.blockedPublish).toBe(false);
  });
});
