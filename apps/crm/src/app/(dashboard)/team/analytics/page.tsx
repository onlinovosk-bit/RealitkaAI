import TeamAnalyticsClient from "@/components/team/TeamAnalyticsClient";
import { resolveTeamAccountTier } from "@/components/team/resolve-team-account-tier";
import { getCurrentProfile } from "@/lib/auth";
import { getTeamPerformanceKpis, getAgentPerformanceMetrics } from "@/lib/team-store";

export default async function TeamAnalyticsPage() {
  const [teamKpis, agentMetrics, profile] = await Promise.all([
    getTeamPerformanceKpis(),
    getAgentPerformanceMetrics(),
    getCurrentProfile(),
  ]);

  const accountTier = resolveTeamAccountTier(
    profile as { account_tier?: string | null; ui_role?: string | null; role?: string | null } | null,
  );

  return (
    <TeamAnalyticsClient
      teamKpis={teamKpis}
      agentMetrics={agentMetrics}
      accountTier={accountTier}
    />
  );
}
