import { describe, expect, it, beforeEach } from "vitest";
import { REALVIA_SMOLKO_13303557 } from "@/lib/capabilities/_shared/fixtures/realvia-smolko-13303557";
import { buildPresentationDeck } from "@/lib/capabilities/presentation-builder";
import { clearCapabilityAuditForTests } from "@/lib/capabilities/_shared/audit-log";

const AGENCY = "11111111-1111-1111-1111-111111111111";

describe("presentation-builder buildPresentationDeck", () => {
  beforeEach(() => clearCapabilityAuditForTests());

  it("owner deck from real fixture source_id=13303557", () => {
    const deck = buildPresentationDeck({
      agencyId: AGENCY,
      property: REALVIA_SMOLKO_13303557,
      audience: "owner",
    });

    expect(deck.sourceId).toBe("13303557");
    expect(deck.slides.length).toBeGreaterThanOrEqual(3);
    expect(deck.guardianPass).toBe(true);
  });

  it("buyer deck from same real fixture", () => {
    const deck = buildPresentationDeck({
      agencyId: AGENCY,
      property: REALVIA_SMOLKO_13303557,
      audience: "buyer",
    });
    expect(deck.audience).toBe("buyer");
    expect(deck.slides[0].title).toContain("kupujúceho");
  });
});
