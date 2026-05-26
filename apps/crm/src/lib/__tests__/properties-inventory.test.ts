import { describe, it, expect } from "vitest";
import { applyPropertyFilters, buildPropertiesSummary } from "@/lib/properties-store";
import type { Property } from "@/lib/properties-store";

const sample: Property[] = [
  {
    id: "1",
    agencyId: "a1",
    title: "Byt BA",
    location: "Bratislava",
    price: 100000,
    type: "Byt",
    rooms: "2",
    features: [],
    status: "Aktívna",
    description: "",
    ownerName: "",
    ownerPhone: "",
  },
  {
    id: "2",
    agencyId: "a1",
    title: "Dom KE",
    location: "Košice",
    price: 200000,
    type: "Dom",
    rooms: "4",
    features: [],
    status: "Predaná",
    description: "",
    ownerName: "",
    ownerPhone: "",
  },
];

describe("buildPropertiesSummary", () => {
  it("counts totals and statuses", () => {
    const s = buildPropertiesSummary(sample);
    expect(s.total).toBe(2);
    expect(s.active).toBe(1);
    expect(s.sold).toBe(1);
  });
});

describe("applyPropertyFilters", () => {
  it("returns full list without filters", () => {
    expect(applyPropertyFilters(sample, {}).length).toBe(2);
  });

  it("filters by status", () => {
    const filtered = applyPropertyFilters(sample, { status: "Aktívna" });
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("1");
  });
});
