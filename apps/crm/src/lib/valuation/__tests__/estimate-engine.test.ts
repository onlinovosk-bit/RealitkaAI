import { describe, expect, it } from "vitest";
import { buildDeterministicEstimate } from "@/lib/valuation/estimate-engine";
import { estimateBandSpreadPct, lookupVerifiedPricePerSqm } from "@/lib/valuation/regional-data";
import { resolveRegionFromLocation } from "@/lib/valuation/resolve-region";

describe("valuation estimate engine", () => {
  it("resolves Košice to KE region", () => {
    expect(resolveRegionFromLocation("Košice, Staré Mesto").regionCode).toBe("KE");
  });

  it("uses national byty fallback for Košice with tighter band than old region-all 18/12", () => {
    const lookup = lookupVerifiedPricePerSqm("KE", "byt");
    expect(lookup?.pricePerSqm).toBe(3378);
    expect(lookup?.bandLowerPct).toBeLessThanOrEqual(12);
    expect(lookup?.bandUpperPct).toBeLessThanOrEqual(8);
  });

  it("returns narrower spread for byt in Košice than legacy 18/12 region-all would", () => {
    const result = buildDeterministicEstimate({
      propertyType: "byt",
      location: "Košice",
      sqm: 75,
    });
    expect(result.noEstimate).toBe(false);
    expect(result.low).toBeGreaterThan(0);
    expect(result.high).toBeGreaterThan(result.low ?? 0);
    const spread = estimateBandSpreadPct(result.low ?? 0, result.high ?? 0);
    expect(spread).toBeLessThanOrEqual(22);
  });

  it("is deterministic for same input", () => {
    const input = { propertyType: "dom" as const, location: "Prešov", sqm: 120 };
    const a = buildDeterministicEstimate(input);
    const b = buildDeterministicEstimate(input);
    expect(a).toEqual(b);
  });

  it("includes disclaimer text", () => {
    const result = buildDeterministicEstimate({
      propertyType: "byt",
      location: "Bratislava",
      sqm: 60,
    });
    expect(result.disclaimer.toLowerCase()).toContain("informatívny");
  });
});
