import type { Lead } from "@/lib/mock-data";

export type AnalyticsPeriod = "7d" | "30d" | "all";

export type OwnerTeamAnalytics = {
  totalLeads: number;
  assignedLeads: number;
  conversionRate: number;
  agentStats: {
    profileId: string;
    name: string;
    leadsCount: number;
    closedCount: number;
  }[];
};

export function buildOwnerTeamAnalytics(
  profiles: { id: string; full_name?: string | null; email?: string | null }[],
  _teams: unknown[],
  leads: Lead[],
  _matches: unknown[],
  opts: { period: AnalyticsPeriod; monthlyLeadTargetPerAgent?: number }
): OwnerTeamAnalytics {
  const now = Date.now();
  const cutoff =
    opts.period === "7d"
      ? now - 7 * 24 * 60 * 60 * 1000
      : opts.period === "30d"
      ? now - 30 * 24 * 60 * 60 * 1000
      : 0;

  const filtered = cutoff
    ? leads.filter((l) => new Date((l as Record<string, unknown>).created_at as string ?? 0).getTime() >= cutoff)
    : leads;

  const assigned = filtered.filter((l) => (l as Record<string, unknown>).assigned_to);
  const closed = filtered.filter((l) => l.status === "Ponuka");

  const agentStats = profiles.map((p) => {
    const agentLeads = filtered.filter((l) => (l as Record<string, unknown>).assigned_to === p.id);
    const agentClosed = agentLeads.filter((l) => l.status === "Ponuka");
    return {
      profileId: p.id,
      name: p.full_name ?? p.email ?? p.id,
      leadsCount: agentLeads.length,
      closedCount: agentClosed.length,
    };
  });

  return {
    totalLeads: filtered.length,
    assignedLeads: assigned.length,
    conversionRate: filtered.length > 0 ? Math.round((closed.length / filtered.length) * 100) : 0,
    agentStats,
  };
}
