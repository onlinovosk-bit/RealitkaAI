import { describe, expect, it } from "vitest";
import { calculateLeadPropertyMatch } from "@/lib/matching";
import type { Property } from "@/lib/properties-store";

const property = {
  id: "property-1",
  type: "",
  location: "",
  rooms: "",
  price: 0,
  features: [],
} as unknown as Property;

describe("matching empty-value guards", () => {
  it("does not score or describe an empty property type", () => {
    const result = calculateLeadPropertyMatch(
      { propertyType: "", location: "", rooms: "", budget: "", note: "", timeline: "", financing: "" } as never,
      property
    );

    expect(result.score).toBe(0);
    expect(result.comparedCriteria).toBe(0);
    expect(result.reasons).not.toContain("typ nehnuteľnosti sedí");
  });

  it("counts only known criteria and never scores empty pairs", () => {
    const result = calculateLeadPropertyMatch(
      {
        propertyType: "Byt",
        location: "",
        rooms: "3 izby",
        budget: "",
        note: "",
        timeline: "",
        financing: "",
      } as never,
      { ...property, type: "Byt", rooms: "3 izby" }
    );

    expect(result.score).toBe(45);
    expect(result.comparedCriteria).toBe(2);
    expect(result.reasons).toEqual(["typ nehnuteľnosti sedí", "počet izieb sedí"]);
  });
});