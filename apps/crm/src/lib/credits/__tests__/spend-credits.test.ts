import { describe, it, expect } from "vitest";
import { computeSpendSplit } from "@/lib/credits/spend-credits";

describe("computeSpendSplit", () => {
  it("spends grant pool before purchase", () => {
    expect(computeSpendSplit(30, 100, 10)).toEqual({
      fromGrant: 10,
      fromPurchase: 0,
    });
  });

  it("splits across grant and purchase when grant insufficient", () => {
    expect(computeSpendSplit(5, 100, 12)).toEqual({
      fromGrant: 5,
      fromPurchase: 7,
    });
  });

  it("uses purchase only when grant exhausted", () => {
    expect(computeSpendSplit(0, 50, 4)).toEqual({
      fromGrant: 0,
      fromPurchase: 4,
    });
  });

  it("returns null when insufficient total balance", () => {
    expect(computeSpendSplit(2, 3, 10)).toBeNull();
  });

  it("returns null for non-positive amount", () => {
    expect(computeSpendSplit(10, 10, 0)).toBeNull();
  });
});
