import { describe, expect, it, beforeEach } from "vitest";
import { REALVIA_SMOLKO_13303557 } from "@/lib/capabilities/_shared/fixtures/realvia-smolko-13303557";
import { clearCapabilityAuditForTests } from "@/lib/capabilities/_shared/audit-log";
import { buildVerticalPackDemo } from "@/lib/capabilities/vertical-pack-demo";
import {
  buildGuardianPanelView,
  isGuardianPublishEnabled,
} from "@/lib/capabilities/quality-guardian/panel-map";
import { reviewGeneratedListing } from "@/lib/capabilities/quality-guardian/review";

const AGENCY = "11111111-1111-1111-1111-111111111111";

describe("buildGuardianPanelView", () => {
  beforeEach(() => clearCapabilityAuditForTests());

  it("returns empty state when no completeness or listing", () => {
    const view = buildGuardianPanelView({ completeness: null, listing: null });
    expect(view.hasOutput).toBe(false);
    expect(view.completenessPercent).toBe(null);
    expect(view.flags).toHaveLength(0);
  });

  it("maps Smolko vertical pack demo to score and pass items", () => {
    const demo = buildVerticalPackDemo({ agencyId: AGENCY, property: REALVIA_SMOLKO_13303557 });
    const view = buildGuardianPanelView({
      completeness: demo.completeness,
      listing: demo.listing,
    });

    expect(view.hasOutput).toBe(true);
    expect(view.completenessPercent).toBe(demo.completeness.scorePercent);
    expect(view.passItems.length).toBeGreaterThan(0);
    expect(view.passItems.every((p) => p.label.length > 0)).toBe(true);
  });

  it("maps area mismatch reason to blocking flag with human label", () => {
    const demo = buildVerticalPackDemo({ agencyId: AGENCY, property: REALVIA_SMOLKO_13303557 });
    const flaggedListing = {
      ...demo.listing,
      guardian: reviewGeneratedListing({
        agencyId: AGENCY,
        source: {
          externalId: "13303557",
          title: demo.listing.headline,
          description: "120 m²",
          price: 0,
          usableArea: 120,
          buildingArea: 167,
          plotArea: 4500,
          location: "Modrá nad Cirochou",
          currency: "EUR",
          rooms: "",
        },
        draft: {
          draftId: "d1",
          headline: demo.listing.headline,
          body: "Plocha 999 m² v centre.",
        },
      }),
    };

    const view = buildGuardianPanelView({ completeness: null, listing: flaggedListing });

    expect(view.flags.some((f) => f.label === "Rozpor v ploche")).toBe(true);
    expect(view.publishBlocked).toBe(true);
    expect(isGuardianPublishEnabled(view)).toBe(false);
  });

  it("unlocks publish when listing guardian passes", () => {
    const demo = buildVerticalPackDemo({ agencyId: AGENCY, property: REALVIA_SMOLKO_13303557 });
    const view = buildGuardianPanelView({
      completeness: demo.completeness,
      listing: demo.listing,
    });

    if (demo.listing.guardian.verdict === "pass") {
      expect(view.flags.filter((f) => f.severity === "blocking")).toHaveLength(0);
      expect(isGuardianPublishEnabled(view)).toBe(true);
    }
  });
});
