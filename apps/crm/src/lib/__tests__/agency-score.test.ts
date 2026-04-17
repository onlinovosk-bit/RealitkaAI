import { describe, it, expect } from "vitest";

import { scoreAgency } from "@/lib/scoring/agency-score";

describe("scoreAgency", () => {
  it("priradí vyššie skóre väčšiemu počtu ponúk", () => {
    expect(scoreAgency({ listings: 0 })).toBe(0);
    expect(scoreAgency({ listings: 15 })).toBeGreaterThan(0);
    expect(scoreAgency({ listings: 60 })).toBeGreaterThan(scoreAgency({ listings: 25 }));
  });

  it("je horným limitom 100", () => {
    expect(scoreAgency({ listings: 999 })).toBeLessThanOrEqual(100);
  });
});
