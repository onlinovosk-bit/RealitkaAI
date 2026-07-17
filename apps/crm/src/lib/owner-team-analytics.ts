import type { Lead } from "@/lib/mock-data";

export type AnalyticsPeriod = "7d" | "30d" | "all";

export type OwnerTeamAgentStat = {
  profileId: string;
  name: string;
  leadsCount: number;
  newLeadsCount: number;
  closedCount: number;
};

export type OwnerTeamAnalytics = {
  totalLeads: number;
  assignedLeads: number;
  unassignedLeads: number;
  conversionRate: number;
  agentStats: OwnerTeamAgentStat[];
};

/**
 * Canonical assignment FK on `leads` is `assigned_profile_id` (mapped as assignedProfileId).
 * `assigned_to` is not a DB column — legacy typo in this module only (cleanup candidate).
 */
export function resolveLeadAssignedProfileId(lead: Lead | Record<string, unknown>): string | null {
  const row = lead as Record<string, unknown>;
  const id = row.assignedProfileId ?? row.assigned_profile_id ?? null;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export function buildOwnerTeamAnalytics(
  profiles: { id: string; full_name?: string | null; fullName?: string | null; email?: string | null }[],
  _teams: unknown[],
  leads: Lead[],
  _matches: unknown[],
  opts: { period: AnalyticsPeriod; monthlyLeadTargetPerAgent?: number },
): OwnerTeamAnalytics {
  const now = Date.now();
  const cutoff =
    opts.period === "7d"
      ? now - 7 * 24 * 60 * 60 * 1000
      : opts.period === "30d"
        ? now - 30 * 24 * 60 * 60 * 1000
        : 0;

  const filtered = cutoff
    ? leads.filter((l) => {
        const row = l as Record<string, unknown>;
        const createdAt = (row.created_at ?? row.createdAt) as string | undefined;
        const ts = createdAt ? new Date(createdAt).getTime() : 0;
        return ts >= cutoff;
      })
    : leads;

  const assigned = filtered.filter((l) => resolveLeadAssignedProfileId(l) != null);
  const closed = filtered.filter((l) => l.status === "Ponuka");

  const agentStats: OwnerTeamAgentStat[] = profiles.map((p) => {
    const agentLeads = filtered.filter((l) => resolveLeadAssignedProfileId(l) === p.id);
    const agentClosed = agentLeads.filter((l) => l.status === "Ponuka");
    const agentNew = agentLeads.filter((l) => l.status === "Nový");
    return {
      profileId: p.id,
      name: p.full_name ?? p.fullName ?? p.email ?? p.id,
      leadsCount: agentLeads.length,
      newLeadsCount: agentNew.length,
      closedCount: agentClosed.length,
    };
  });

  agentStats.sort((a, b) => b.leadsCount - a.leadsCount || a.name.localeCompare(b.name, "sk"));

  return {
    totalLeads: filtered.length,
    assignedLeads: assigned.length,
    unassignedLeads: filtered.length - assigned.length,
    conversionRate: filtered.length > 0 ? Math.round((closed.length / filtered.length) * 100) : 0,
    agentStats,
  };
}
