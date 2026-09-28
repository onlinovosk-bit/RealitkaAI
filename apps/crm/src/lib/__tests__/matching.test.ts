import { describe, expect, it } from "vitest";
import { calculateLeadPropertyMatch } from "@/lib/matching";
import type { Lead } from "@/lib/mock-data";
import type { Property } from "@/lib/properties-store";

function lead(partial: Partial<Lead>): Lead {
  return {
    id: "L1",
    name: "Test",
    email: "t@example.com",
    phone: "",
    location: "",
    budget: "",
    propertyType: "",
    rooms: "",
    financing: "",
    timeline: "",
    source: "test",
    status: "Nový",
    score: 0,
    assignedAgent: "",
    lastContact: "",
    note: "",
    ...partial,
  };
}

function property(partial: Partial<Property>): Property {
  return {
    id: "P1",
    agencyId: null,
    title: "Test",
    location: "",
    price: 0,
    type: "",
    rooms: "",
    features: [],
    status: "active",
    description: "",
    ownerName: "",
    ownerPhone: "",
    ...partial,
  };
}

describe("matching empty-value guards", () => {
  it("does not score when both propertyType values are empty", () => {
    const result = calculateLeadPropertyMatch(
      lead({ propertyType: "" }),
      property({ type: "" }),
    );
    expect(result.score).toBe(0);
    expect(result.reasons.some((r) => r.includes("typ"))).toBe(false);
    expect(result.comparedCriteria).toBe(0);
  });

  it("does not score when both rooms values are empty", () => {
    const result = calculateLeadPropertyMatch(
      lead({ rooms: "" }),
      property({ rooms: "" }),
    );
    expect(result.score).toBe(0);
    expect(result.reasons.some((r) => r.includes("izieb") || r.includes("izby"))).toBe(false);
  });

  it("does not score empty/whitespace features as výbava", () => {
    const result = calculateLeadPropertyMatch(
      lead({ note: "hľadá byt" }),
      property({ features: ["", "  "] }),
    );
    expect(result.reasons.some((r) => r.includes("výbava"))).toBe(false);
    expect(result.score).toBe(0);
  });

  it("scores filled matching type/rooms/features as before", () => {
    const result = calculateLeadPropertyMatch(
      lead({
        propertyType: "Byt",
        rooms: "3 izby",
        note: "chce balkón a garáž",
        location: "Poprad",
        budget: "200000",
      }),
      property({
        type: "Byt",
        rooms: "3 izby",
        features: ["balkón", "garáž"],
        location: "Poprad centrum",
        price: 180000,
      }),
    );
    expect(result.score).toBeGreaterThanOrEqual(25 + 20);
    expect(result.reasons).toContain("typ nehnuteľnosti sedí");
    expect(result.reasons).toContain("počet izieb sedí");
    expect(result.reasons).toContain("sedí výbava");
    expect(result.comparedCriteria).toBeGreaterThanOrEqual(3);
  });

  it("returns comparedCriteria for only both-present criteria", () => {
    const result = calculateLeadPropertyMatch(
      lead({ propertyType: "Byt", rooms: "" }),
      property({ type: "Byt", rooms: "" }),
    );
    // type compared; rooms not; no location/budget/features
    expect(result.comparedCriteria).toBe(1);
    expect(result.score).toBe(25);
  });
});