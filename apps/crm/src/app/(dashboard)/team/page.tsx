import ModuleShell from "@/components/shared/module-shell";
import EmptyState from "@/components/shared/empty-state";
import ErrorState from "@/components/shared/error-state";
import LockedFeatureCard from "@/components/shared/locked-feature-card";
import FeatureGateBanner from "@/components/shared/feature-gate-banner";
import TeamFilters from "@/components/team/team-filters";
import TeamVisibilityBanner from "@/components/team/team-visibility-banner";
import TeamCreateForm from "@/components/team/team-create-form";
import UserCreateForm from "@/components/team/user-create-form";
import TeamsTable from "@/components/team/teams-table";
import TeamUsersTable from "@/components/team/team-users-table";
import LeadAssignmentTable from "@/components/team/lead-assignment-table";
import { safeServerAction } from "@/lib/safe-action";
import { getCurrentProfile } from "@/lib/auth";
import { getTeamDashboardData } from "@/lib/team-store";
import {
  canManageTeamArea,
  getAssignableProfilesForProfile,
  getVisibleLeadsForProfile,
  getVisibleProfilesForProfile,
  getVisibleTeamsForProfile,
} from "@/lib/team-visibility";
import { getFeatureGateState } from "@/lib/feature-gating";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ teamId?: string }>;
}) {
  const params = await searchParams;
  const currentProfile = await getCurrentProfile();

  const gate = await getFeatureGateState("teamManagement");

  if (!gate.enabled) {
    return (
      <ModuleShell
        title="Používatelia a tímy"
        description="Role-aware pohľady, priraďovanie príležitostí a filtrovanie podľa tímu."
      >
        <LockedFeatureCard
          title="Team management je zamknutý"
          description={gate.reason || "Správa tímov nie je dostupná pre aktuálny plán."}
        />
      </ModuleShell>
    );
  }

  const result = await safeServerAction(
    async () => {
      const data = await getTeamDashboardData();
      return data;
    },
    "Nepodarilo sa načítať modul používateľov a tímov."
  );

  if (!result.ok) {
    return (
      <ModuleShell
        title="Používatelia a tímy"
        description="Role-aware pohľady, priraďovanie príležitostí a filtrovanie podľa tímu."
      >
        <ErrorState
          title="Modul tímov sa nepodarilo načítať"
          description={result.error}
        />
      </ModuleShell>
    );
  }

  const { agencies, teams, profiles, leads } = result.data;

  const visibleTeamsAll = getVisibleTeamsForProfile(currentProfile as any, teams);
  const visibleProfilesAll = getVisibleProfilesForProfile(currentProfile as any, profiles);
  const visibleLeadsAll = getVisibleLeadsForProfile(currentProfile as any, leads, profiles);

  const selectedTeamId = params.teamId ?? "";

  const visibleTeams = selectedTeamId
    ? visibleTeamsAll.filter((team) => team.id === selectedTeamId)
    : visibleTeamsAll;

  const visibleProfiles = selectedTeamId
    ? visibleProfilesAll.filter((profile) => profile.teamId === selectedTeamId)
    : visibleProfilesAll;

  const visibleProfileIds = visibleProfiles.map((item) => item.id);
  const visibleProfileNames = visibleProfiles.map((item) => item.fullName);

  const visibleLeads = selectedTeamId
    ? visibleLeadsAll.filter((lead: any) => {
        const assignedProfileId = lead.assignedProfileId ?? lead.assigned_profile_id ?? null;
        const assignedAgent = lead.assignedAgent ?? lead.assigned_agent ?? "";
        return (
          (assignedProfileId && visibleProfileIds.includes(assignedProfileId)) ||
          (assignedAgent && visibleProfileNames.includes(assignedAgent))
        );
      })
    : visibleLeadsAll;

  const assignableProfiles = getAssignableProfilesForProfile(currentProfile as any, profiles);

  const totalUsers = visibleProfiles.length;
  const totalTeams = visibleTeams.length;
  const totalLeads = visibleLeads.length;
  const assignedLeads = visibleLeads.filter(
    (lead: any) => (lead.assignedAgent && lead.assignedAgent !== "Nepriradený")
  ).length;

  const canManage = canManageTeamArea(currentProfile as any);
  const primaryAgency = agencies[0];
  const currentTeamName =
    teams.find((team) => team.id === currentProfile?.team_id)?.name ||
    teams.find((team) => team.id === (currentProfile as any)?.teamId)?.name ||
    null;

  return (
    <ModuleShell
      title="Používatelia a tímy"
      description="Role-aware pohľady, priraďovanie príležitostí a filtrovanie podľa tímu."
    >
      <FeatureGateBanner description="Team management je aktivovaný v tvojom pláne." title="Team management je aktívny" />

      <section className="mt-6 mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Viditeľní používatelia</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{totalUsers}</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Viditeľné tímy</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{totalTeams}</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Viditeľné leady</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{totalLeads}</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Priradené leady</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{assignedLeads}</h2>
        </div>

        <TeamVisibilityBanner
          role={(currentProfile as any)?.role ?? "agent"}
          teamName={currentTeamName}
        />
      </section>

      <section className="mb-6">
        <TeamFilters
          visibleTeams={visibleTeamsAll.map((team) => ({
            id: team.id,
            name: team.name,
          }))}
          selectedTeamId={selectedTeamId}
        />
      </section>

      <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TeamCreateForm
          agencyId={primaryAgency?.id ?? ""}
          canCreate={canManage}
        />
        <UserCreateForm
          agencyId={primaryAgency?.id ?? ""}
          teams={visibleTeamsAll.map((team) => ({
            id: team.id,
            name: team.name,
          }))}
          canCreate={canManage}
        />
      </section>

      {visibleProfiles.length === 0 && visibleTeams.length === 0 && visibleLeads.length === 0 ? (
        <EmptyState
          title="V tomto pohľade nie sú dostupné žiadne tímové dáta"
          description="Skontroluj rolu používateľa alebo vyber iný tím."
        />
      ) : (
        <>
          <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <TeamsTable teams={visibleTeams} />
            <TeamUsersTable profiles={visibleProfiles} teams={teams} />
          </section>

          <LeadAssignmentTable
            leads={visibleLeads.map((lead: any) => ({
              id: lead.id,
              name: lead.name,
              location: lead.location,
              status: lead.status,
              assignedAgent: lead.assignedAgent ?? lead.assigned_agent ?? "Nepriradený",
              assignedProfileId: lead.assignedProfileId ?? lead.assigned_profile_id ?? null,
            }))}
            assignableProfiles={assignableProfiles.map((profile) => ({
              id: profile.id,
              fullName: profile.fullName,
              role: profile.role,
              teamId: profile.teamId,
            }))}
            canAssign={canManage}
          />
        </>
      )}
    </ModuleShell>
  );
}
