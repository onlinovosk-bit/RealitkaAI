import TeamAnalyticsClient from "@/components/team/TeamAnalyticsClient";
import { resolveTeamAccountTier } from "@/components/team/resolve-team-account-tier";
import { getCurrentProfile } from "@/lib/auth";
import { getTeamPerformanceKpis, getAgentPerformanceMetrics } from "@/lib/team-store";
import { getRscSupabase } from "@/lib/supabase/rsc-client";

export default async function TeamAnalyticsPage() {
  const supabase = await getRscSupabase();
  const [teamKpis, agentMetrics, profile] = await Promise.all([
    getTeamPerformanceKpis(),
    getAgentPerformanceMetrics(),
    getCurrentProfile(),
  ]);

  let agencyManualPlan: string | null = null;
  if (profile?.agency_id) {
    const { data: agency } = await supabase
      .from("agencies")
      .select("manual_plan")
      .eq("id", profile.agency_id)
      .maybeSingle();
    agencyManualPlan = agency?.manual_plan ?? null;
  }

  const accountTier = resolveTeamAccountTier(
    profile as { account_tier?: string | null; ui_role?: string | null; role?: string | null } | null,
    agencyManualPlan,
  );

  return (
    <TeamAnalyticsClient
      teamKpis={teamKpis}
      agentMetrics={agentMetrics}
      accountTier={accountTier}
    />
  );
}
