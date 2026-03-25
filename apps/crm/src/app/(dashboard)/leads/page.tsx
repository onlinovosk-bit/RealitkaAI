import ModuleShell from "@/components/shared/module-shell";
import ErrorState from "@/components/shared/error-state";
import LeadsModule from "@/components/leads/leads-module";
import { safeServerAction } from "@/lib/safe-action";
import { listLeads } from "@/lib/leads-store";
import { listTeams, listProfiles } from "@/lib/team-store";
import { recommendations } from "@/lib/mock-data";

export default async function LeadsPage() {

  const result = await safeServerAction(
    async () => {
      const [leads, teams, profiles] = await Promise.all([
        listLeads(),
        listTeams(),
        listProfiles(),
      ]);

      return { leads, teams, profiles };
    },
    "Nepodarilo sa načítať leady."
  );

  if (!result.ok) {
    return (
      <ModuleShell
        title="Leady"
        description="Profesionálny prehľad klientov, priorít a AI odporúčaní."
      >
        <ErrorState
          title="Leady sa nepodarilo načítať"
          description={result.error}
        />
      </ModuleShell>
    );
  }

  const { leads, teams, profiles } = result.data;

  return (
    <ModuleShell
      title="Leady"
      description="Profesionálny prehľad klientov, priorít a AI odporúčaní."
    >
      <LeadsModule
        leads={leads}
        teams={teams.map((team) => ({ id: team.id, name: team.name }))}
        profiles={profiles.map((profile) => ({
          id: profile.id,
          teamId: profile.teamId,
          fullName: profile.fullName,
          isActive: profile.isActive,
        }))}
        recommendations={recommendations}
      />
    </ModuleShell>
  );
}
