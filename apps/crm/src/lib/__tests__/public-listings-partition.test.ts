import { describe, expect, it } from "vitest";
import { REALVIA_MAPPING_UNKNOWN } from "@/lib/realvia/map-taxonomy";
import {
  partitionPublicListings,
  publicListingTypeLabel,
} from "@/lib/public-listings-partition";

describe("partitionPublicListings", () => {
  const rows = [
    { id: "1", type: "Byt", transactionType: "Predaj", price: 100_000 },
    { id: "2", type: REALVIA_MAPPING_UNKNOWN, transactionType: "Predaj", price: 90_000 },
    { id: "3", type: "Dom", transactionType: REALVIA_MAPPING_UNKNOWN, price: 200_000 },
    { id: "4", type: "Ostatné", transactionType: "Predaj", price: 80_000 },
  ];

  it("keeps exact type matches and parks Neznáme in unknown section", () => {
    const { matched, unknown } = partitionPublicListings(rows, { typeFilter: "Byt" });
    expect(matched.map((r) => r.id)).toEqual(["1"]);
    expect(unknown.map((r) => r.id).sort()).toEqual(["2", "3"]);
  });

  it("does not treat Ostatné as unknown (isRealviaMappingUnknown only)", () => {
    const { matched, unknown } = partitionPublicListings(rows, { typeFilter: "Byt" });
    expect(matched.some((r) => r.id === "4")).toBe(false);
    expect(unknown.some((r) => r.id === "4")).toBe(false);
  });

  it("applies budget filter to both sections", () => {
    const { matched, unknown } = partitionPublicListings(rows, {
      typeFilter: "Byt",
      budgetMax: 95_000,
    });
    expect(matched).toEqual([]);
    expect(unknown.map((r) => r.id)).toEqual(["2"]);
  });
});

describe("publicListingTypeLabel", () => {
  it("labels Neznáme honestly", () => {
    expect(publicListingTypeLabel(REALVIA_MAPPING_UNKNOWN)).toBe("Typ zatiaľ neurčený");
    expect(publicListingTypeLabel("Byt")).toBe("Byt");
  });
});
