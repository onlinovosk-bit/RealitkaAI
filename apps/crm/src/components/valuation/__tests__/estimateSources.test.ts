import { describe, expect, it } from "vitest";

import { sourcesForPriceSource } from "@/lib/valuation/attribution-sources";

describe("sourcesForPriceSource", () => {
  it("city includes NBS and Realitný barometer", () => {
    expect(sourcesForPriceSource("city")).toEqual([
      "NBS (United Classifieds, NARKS)",
      "Realitný barometer RÚ SR",
    ]);
  });

  it("region and national are NBS only", () => {
    expect(sourcesForPriceSource("region")).toEqual(["NBS (United Classifieds, NARKS)"]);
    expect(sourcesForPriceSource("national")).toEqual(["NBS (United Classifieds, NARKS)"]);
  });

  it("none / undefined yields empty (omitted from response)", () => {
    expect(sourcesForPriceSource("none")).toEqual([]);
    expect(sourcesForPriceSource(undefined)).toEqual([]);
  });
});
