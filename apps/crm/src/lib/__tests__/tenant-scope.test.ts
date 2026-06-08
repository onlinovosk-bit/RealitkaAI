import { describe, expect, it } from "vitest";
import { filterRowsByAgency } from "@/lib/tenant-scope";

describe("filterRowsByAgency", () => {
  const rows = [
    { id: "a", agency_id: "agency-1" },
    { id: "b", agency_id: "agency-2" },
    { id: "c", agency_id: null },
  ];

  it("returns only rows for the session agency", () => {
    expect(filterRowsByAgency(rows, "agency-1")).toEqual([{ id: "a", agency_id: "agency-1" }]);
  });

  it("returns empty when agency is unknown", () => {
    expect(filterRowsByAgency(rows, null)).toEqual([]);
  });
});
