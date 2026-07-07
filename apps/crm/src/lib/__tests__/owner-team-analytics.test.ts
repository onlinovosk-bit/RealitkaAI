import { describe, expect, it } from "vitest";
import {
  buildOwnerTeamAnalytics,
  resolveLeadAssignedProfileId,
} from "@/lib/owner-team-analytics";
import type { Lead } from "@/lib/mock-data";

const profiles = [
  { id: "p1", full_name: "Adamovičová" },
  { id: "p2", full_name: "Birkner" },
  { id: "p3", full_name: "Prázdny" },
];

function lead(partial: Partial<Lead> & { id: string }): Lead {
  return {
    id: partial.id,
    name: partial.name ?? partial.id,
    email: "",
    phone: "",
    location: "",
    budget: "",
    propertyType: "Byt",
    rooms: "",
    financing: "",
    timeline: "",
    source: "test",
    status: partial.status ?? "Nový",
    score: 50,
    assignedAgent: "Nepriradený",
    assignedProfileId: partial.assignedProfileId ?? null,
    lastContact: "",
    note: "",
    ...partial,
  };
}

describe("resolveLeadAssignedProfileId", () => {
  it("reads assignedProfileId (canonical mapper field)", () => {
    expect(resolveLeadAssignedProfileId({ assignedProfileId: "p1" } as Lead)).toBe("p1");
  });

  it("reads assigned_profile_id snake_case fallback", () => {
    expect(resolveLeadAssignedProfileId({ assigned_profile_id: "p2" } as Record<string, unknown>)).toBe(
      "p2",
    );
  });

  it("does not read ghost assigned_to", () => {
    expect(resolveLeadAssignedProfileId({ assigned_to: "p1" } as Record<string, unknown>)).toBeNull();
  });
});

describe("buildOwnerTeamAnalytics", () => {
  it("counts leads per profile via assignedProfileId and lists all profiles", () => {
    const leads = [
      lead({ id: "l1", assignedProfileId: "p1", status: "Nový" }),
      lead({ id: "l2", assignedProfileId: "p1", status: "Ponuka" }),
      lead({ id: "l3", assignedProfileId: "p2", status: "Teplý" }),
      lead({ id: "l4", assignedProfileId: null }),
    ];

    const result = buildOwnerTeamAnalytics(profiles, [], leads, [], { period: "all" });

    expect(result.assignedLeads).toBe(3);
    expect(result.unassignedLeads).toBe(1);
    expect(result.agentStats).toHaveLength(3);

    const p1 = result.agentStats.find((a) => a.profileId === "p1");
    const p2 = result.agentStats.find((a) => a.profileId === "p2");
    const p3 = result.agentStats.find((a) => a.profileId === "p3");

    expect(p1).toMatchObject({ leadsCount: 2, newLeadsCount: 1, closedCount: 1 });
    expect(p2).toMatchObject({ leadsCount: 1, newLeadsCount: 0, closedCount: 0 });
    expect(p3).toMatchObject({ leadsCount: 0, newLeadsCount: 0, closedCount: 0 });
  });
});
