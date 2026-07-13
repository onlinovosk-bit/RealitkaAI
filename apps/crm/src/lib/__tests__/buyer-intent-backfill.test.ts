import { describe, expect, it } from "vitest";
import {
  buildBuyerIntentFromLead,
  inferDealTypeFromLeadFields,
  mapSkPropertyTypeToIntent,
  parseLeadBudgetString,
} from "@/lib/buyer-intent";

describe("mapSkPropertyTypeToIntent", () => {
  it("maps Byt to flat", () => {
    expect(mapSkPropertyTypeToIntent("Byt")).toBe("flat");
  });

  it("returns null for empty or Predaj", () => {
    expect(mapSkPropertyTypeToIntent("")).toBeNull();
    expect(mapSkPropertyTypeToIntent("Predaj")).toBeNull();
  });
});

describe("inferDealTypeFromLeadFields", () => {
  it("treats Byt as buy signal", () => {
    expect(inferDealTypeFromLeadFields({ propertyType: "Byt" })).toBe("buy");
  });

  it("maps Predaj to sell", () => {
    expect(inferDealTypeFromLeadFields({ propertyType: "Predaj" })).toBe("sell");
  });
});

describe("parseLeadBudgetString", () => {
  it("parses range", () => {
    expect(parseLeadBudgetString("100 000 – 200 000 €")).toEqual({
      budgetMin: 100_000,
      budgetMax: 200_000,
    });
  });
});

describe("buildBuyerIntentFromLead", () => {
  it("builds intent for Smolko Byt lead", () => {
    const result = buildBuyerIntentFromLead({
      id: "lead-1",
      name: "Test",
      email: "a@b.c",
      location: "Prešov",
      budget: "",
      property_type: "Byt",
      financing: "Hypotéka",
      timeline: "Do 3 mesiacov",
      status: "Nový",
      note: "",
      client_segment: null,
      buyer_readiness_score: null,
    });

    expect(result.skipReason).toBeUndefined();
    expect(result.intentInput?.propertyType).toBe("flat");
    expect(result.intentInput?.dealType).toBe("buy");
    expect(result.intentInput?.needsMortgageHelp).toBe(true);
  });

  it("skips empty property_type as insufficient_source_data", () => {
    const result = buildBuyerIntentFromLead({
      id: "lead-2",
      name: "Empty",
      email: null,
      location: null,
      budget: null,
      property_type: "",
      financing: null,
      timeline: null,
      status: null,
      note: null,
      client_segment: null,
      buyer_readiness_score: null,
    });

    expect(result.skipReason).toBe("insufficient_source_data");
  });
});
