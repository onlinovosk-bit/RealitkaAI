import ModuleShell from "@/components/shared/module-shell";
import ErrorState from "@/components/shared/error-state";
import LeadsModule from "@/components/leads/leads-module";
import { safeServerAction } from "@/lib/safe-action";
import { listLeads } from "@/lib/leads-store";
import { listTeams, listProfiles } from "@/lib/team-store";
import { recommendations } from "@/lib/mock-data";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { scope } = await searchParams;

  const result = await safeServerAction(
    async () => {
      const [leads, teams, profiles] = await Promise.all([
        listLeads(),
        listTeams(),
        listProfiles(),
      ]);

      return { leads, teams, profiles };
    },
    "Nepodarilo sa načítať príležitosti."
  );

  if (!result.ok) {
    return (
      <ModuleShell
        title="Príležitosti"
        description="Profesionálny prehľad klientov, priorít a AI odporúčaní."
      >
        <ErrorState
          title="Príležitosti sa nepodarilo načítať"
          description={result.error}
        />
      </ModuleShell>
    );
  }

  const { leads, teams, profiles } = result.data;

  return (
    <ModuleShell
      title={scope === "team" ? "Leady kolegov" : "Príležitosti"}
      description="Profesionálny prehľad klientov, priorít a AI odporúčaní."
    >
      {scope === "team" && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
          Zobrazujú sa príležitosti pridelené kolegom vo vašom tíme.
        </div>
      )}
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
