import { afterEach, describe, expect, it, vi } from "vitest";
import { buildDeterministicEstimate } from "@/lib/valuation/estimate-engine";
import * as regionalData from "@/lib/valuation/regional-data";
import {
  estimateBandSpreadPct,
  lookupVerifiedPricePerSqm,
} from "@/lib/valuation/regional-data";
import {
  foldDiacritics,
  resolveRegionFromLocation,
} from "@/lib/valuation/resolve-region";

describe("valuation estimate engine", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves Košice to KE region", () => {
    expect(resolveRegionFromLocation("Košice, Staré Mesto").regionCode).toBe(
      "KE",
    );
    expect(resolveRegionFromLocation("Košice, Staré Mesto").matchKind).toBe(
      "region",
    );
  });

  it("uses national byty fallback for Košice with wider national band (-18/+8)", () => {
    const lookup = lookupVerifiedPricePerSqm("KE", "byt");
    expect(lookup?.pricePerSqm).toBe(3378);
    expect(lookup?.priceSource).toBe("national");
    expect(lookup?.bandLowerPct).toBe(18);
    expect(lookup?.bandUpperPct).toBe(8);
  });

  it("returns band for byt in Košice under national spread", () => {
    const result = buildDeterministicEstimate({
      propertyType: "byt",
      location: "Košice",
      sqm: 75,
    });
    expect(result.noEstimate).toBe(false);
    expect(result.priceSource).toBe("national");
    expect(result.low).toBeGreaterThan(0);
    expect(result.high).toBeGreaterThan(result.low ?? 0);
    const spread = estimateBandSpreadPct(result.low ?? 0, result.high ?? 0);
    // -18/+8 → ~26% mid spread after rounding
    expect(spread).toBeLessThanOrEqual(28);
    expect(spread).toBeGreaterThanOrEqual(20);
  });

  it("is deterministic for same input", () => {
    const input = {
      propertyType: "dom" as const,
      location: "Bardejov",
      sqm: 120,
    };
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

  it("GOLDEN: Poprad 70 m² byt lands in 145k–185k (city anchor, not national 3378)", () => {
    const result = buildDeterministicEstimate({
      propertyType: "byt",
      location: "Poprad",
      sqm: 70,
    });
    expect(result.noEstimate).toBe(false);
    expect(result.priceSource).toBe("city");
    expect(result.pricePerSqm).toBe(2361);
    expect(result.low).toBeGreaterThanOrEqual(145_000);
    expect(result.high).toBeLessThanOrEqual(185_000);
    // Explicit mid check: 2361*70=165270 → −12%/+8% → 145000–178000
    expect(result.low).toBe(145_000);
    expect(result.high).toBe(178_000);
  });

  it("Poprad / poprad / POPRAD / Popradu resolve to the same city anchor", () => {
    const variants = ["Poprad", "poprad", "POPRAD", "Popradu"];
    const resolved = variants.map((v) => resolveRegionFromLocation(v));
    for (const r of resolved) {
      expect(r.regionCode).toBe("poprad");
      expect(r.matchKind).toBe("city");
    }
    const estimates = variants.map((location) =>
      buildDeterministicEstimate({
        propertyType: "byt",
        location,
        sqm: 70,
      }),
    );
    for (const e of estimates) {
      expect(e.priceSource).toBe("city");
      expect(e.pricePerSqm).toBe(2361);
      expect(e.low).toBe(estimates[0]!.low);
      expect(e.high).toBe(estimates[0]!.high);
    }
  });

  it("Prešovský kraj maps to PO region, not city Presov stem", () => {
    const resolved = resolveRegionFromLocation("Prešovský kraj");
    expect(resolved.regionCode).toBe("PO");
    expect(resolved.matchKind).toBe("region");
  });

  it("unknown location Xyzabc is never city (national or none)", () => {
    const resolved = resolveRegionFromLocation("Xyzabc");
    expect(resolved.matchKind).not.toBe("city");
    expect(resolved.regionCode).toBe("SK");

    const result = buildDeterministicEstimate({
      propertyType: "byt",
      location: "Xyzabc",
      sqm: 70,
    });
    expect(result.priceSource).not.toBe("city");
    expect(["national", "none"]).toContain(result.priceSource);
  });

  it("priceSource none yields no numeric estimate", () => {
    vi.spyOn(regionalData, "lookupVerifiedPricePerSqm").mockReturnValue(null);
    const result = buildDeterministicEstimate({
      propertyType: "byt",
      location: "Poprad",
      sqm: 70,
    });
    expect(result.priceSource).toBe("none");
    expect(result.noEstimate).toBe(true);
    expect(result.low).toBeUndefined();
    expect(result.high).toBeUndefined();
    expect(result.pricePerSqm).toBeUndefined();
  });

  it("foldDiacritics matches normaliseStreet NFD strip", () => {
    expect(foldDiacritics("Prešov")).toBe("presov");
    expect(foldDiacritics("Humenné")).toBe("humenne");
  });
});
