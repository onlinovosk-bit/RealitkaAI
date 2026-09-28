import { describe, expect, it } from "vitest";
import {
  REALVIA_MAPPING_UNKNOWN,
  REALVIA_TRANSACTION_DEMAND,
} from "@/lib/realvia/map-taxonomy";
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
    { id: "5", type: "Byt", transactionType: REALVIA_TRANSACTION_DEMAND, price: 0 },
    { id: "6", type: "Chata", transactionType: "Predaj", price: 50_000 },
    { id: "7", type: "Záhradný domček", transactionType: "Predaj", price: 40_000 },
  ];

  it("keeps exact type matches and parks Neznáme in unknown section", () => {
    const { matched, unknown, demand } = partitionPublicListings(rows, {
      typeFilter: "Byt",
    });
    expect(matched.map((r) => r.id)).toEqual(["1"]);
    expect(unknown.map((r) => r.id).sort()).toEqual(["2", "3"]);
    expect(demand.map((r) => r.id)).toEqual(["5"]);
  });

  it("never puts demand (Dopyt) into matched or unknown", () => {
    const { matched, unknown, demand } = partitionPublicListings(rows, {});
    expect(demand.map((r) => r.id)).toEqual(["5"]);
    expect(matched.some((r) => r.id === "5")).toBe(false);
    expect(unknown.some((r) => r.id === "5")).toBe(false);
  });

  it("accepts typeFilter as array for Chata + Záhradný domček", () => {
    const { matched, demand } = partitionPublicListings(rows, {
      typeFilter: ["Chata", "Záhradný domček"],
    });
    expect(matched.map((r) => r.id).sort()).toEqual(["6", "7"]);
    // Demand is type-agnostic bucket — still isolated from matched
    expect(demand.map((r) => r.id)).toEqual(["5"]);
    expect(matched.some((r) => r.id === "5")).toBe(false);
  });

  it("does not treat Ostatné as unknown (isRealviaMappingUnknown only)", () => {
    const { matched, unknown } = partitionPublicListings(rows, { typeFilter: "Byt" });
    expect(matched.some((r) => r.id === "4")).toBe(false);
    expect(unknown.some((r) => r.id === "4")).toBe(false);
  });

  it("applies budget filter to matched, unknown, and demand", () => {
    const { matched, unknown, demand } = partitionPublicListings(rows, {
      typeFilter: "Byt",
      budgetMax: 95_000,
    });
    expect(matched).toEqual([]);
    expect(unknown.map((r) => r.id)).toEqual(["2"]);
    expect(demand.map((r) => r.id)).toEqual(["5"]);
  });
});

describe("publicListingTypeLabel", () => {
  it("labels Neznáme honestly", () => {
    expect(publicListingTypeLabel(REALVIA_MAPPING_UNKNOWN)).toBe("Typ zatiaľ neurčený");
    expect(publicListingTypeLabel("Byt")).toBe("Byt");
  });
});
