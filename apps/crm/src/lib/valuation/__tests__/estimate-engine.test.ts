import { describe, expect, it } from "vitest";
import { buildDeterministicEstimate } from "@/lib/valuation/estimate-engine";
import { resolveRegionFromLocation } from "@/lib/valuation/resolve-region";

describe("valuation estimate engine", () => {
  it("resolves Košice to KE region", () => {
    expect(resolveRegionFromLocation("Košice, Staré Mesto").regionCode).toBe("KE");
  });

  it("returns verified band for byt in Košice using region fallback", () => {
    const result = buildDeterministicEstimate({
      propertyType: "byt",
      location: "Košice",
      sqm: 75,
    });
    expect(result.noEstimate).toBe(false);
    expect(result.low).toBeGreaterThan(0);
    expect(result.high).toBeGreaterThan(result.low ?? 0);
    expect(result.regionCode).toBe("KE");
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
