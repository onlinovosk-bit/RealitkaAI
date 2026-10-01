import { describe, expect, it } from "vitest";
import { sortLeadsByTriagePriority, truncateReason } from "../top-priority-leads";
import type { Lead } from "@/lib/leads-store";

function lead(partial: Partial<Lead> & { id: string; name: string }): Lead {
  return {
    email: "",
    phone: "",
    location: "",
    budget: "",
    propertyType: "Byt",
    rooms: "",
    financing: "Hypotéka",
    timeline: "",
    source: "Web",
    status: "Nový",
    score: 50,
    assignedAgent: "Nepriradený",
    lastContact: "",
    note: "",
    createdAt: "2026-07-01T00:00:00.000Z",
    aiPriority: null,
    aiReason: null,
    ...partial,
  } as Lead;
}

describe("sortLeadsByTriagePriority", () => {
  it("orders Vysoká before Stredná and newer created_at within same priority", () => {
    const sorted = sortLeadsByTriagePriority([
      lead({ id: "a", name: "A", aiPriority: "Stredná", createdAt: "2026-07-02T00:00:00.000Z" }),
      lead({ id: "b", name: "B", aiPriority: "Vysoká", createdAt: "2026-07-01T00:00:00.000Z" }),
      lead({ id: "c", name: "C", aiPriority: "Vysoká", createdAt: "2026-07-03T00:00:00.000Z" }),
    ]);
    expect(sorted.map((l) => l.id)).toEqual(["c", "b", "a"]);
  });
});

describe("truncateReason", () => {
  it("returns empty for blank and truncates long text", () => {
    expect(truncateReason("")).toBe("");
    expect(truncateReason("x".repeat(130))).toHaveLength(120);
  });
});
