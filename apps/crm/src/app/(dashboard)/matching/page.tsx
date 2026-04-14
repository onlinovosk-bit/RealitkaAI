import ModuleShell from "@/components/shared/module-shell";
import EmptyState from "@/components/shared/empty-state";
import ErrorState from "@/components/shared/error-state";
import RecalculateMatchesPanel from "@/components/matching/recalculate-matches-panel";
import MatchesTable from "@/components/matching/matches-table";
import PropertyMatchPanel from "@/components/matching/property-match-panel";
import { listPersistedMatches } from "@/lib/matching-store";
import { listLeads } from "@/lib/leads-store";
import { listProperties } from "@/lib/properties-store";
import { safeServerAction } from "@/lib/safe-action";

export default async function MatchingPage() {
  const result = await safeServerAction(
    async () => {
      const [matches, leads, properties] = await Promise.all([
        listPersistedMatches(),
        listLeads(),
        listProperties(),
      ]);

      return { matches, leads, properties };
    },
    "Nepodarilo sa načítať matching."
  );

  if (!result.ok) {
    return (
      <ModuleShell
        title="Matching"
        description="Matching Engine 2.0 s automatickým prepočtom pri zmene príležitosti alebo nehnuteľnosti."
      >
        <ErrorState
          title="Matching sa nepodarilo načítať"
          description={result.error}
        />
      </ModuleShell>
    );
  }

  const { matches, leads, properties } = result.data;

  const rows = matches.map((match) => {
    const lead = leads.find((item) => item.id === match.leadId);
    const property = properties.find((item) => item.id === match.propertyId);

    return {
      id: match.id,
      leadId: match.leadId,
      propertyId: match.propertyId,
      matchScore: match.matchScore,
      reasons: match.reasons,
      modelVersion: match.modelVersion,
      leadName: lead?.name ?? match.leadId,
      propertyTitle: property?.title ?? match.propertyId,
      propertyLocation: property?.location ?? "-",
      propertyPrice: property?.price ?? 0,
    };
  });

  const propertySummaryMap = new Map<string, { propertyTitle: string; count: number; totalScore: number }>();

  rows.forEach((row) => {
    const current = propertySummaryMap.get(row.propertyId) ?? {
      propertyTitle: row.propertyTitle,
      count: 0,
      totalScore: 0,
    };

    current.count += 1;
    current.totalScore += row.matchScore;

    propertySummaryMap.set(row.propertyId, current);
  });

  const propertySummary = [...propertySummaryMap.entries()]
    .map(([propertyId, value]) => ({
      propertyId,
      propertyTitle: value.propertyTitle,
      count: value.count,
      avgScore: Math.round(value.totalScore / value.count),
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 10);

  const totalMatches = rows.length;
  const strongMatches = rows.filter((item) => item.matchScore >= 80).length;
  const mediumMatches = rows.filter((item) => item.matchScore >= 60 && item.matchScore < 80).length;
  const uniqueLeadCount = new Set(rows.map((item) => item.leadId)).size;

  return (
    <ModuleShell
      title="Matching"
      description="Matching Engine 2.0 s automatickým prepočtom pri zmene príležitosti alebo nehnuteľnosti."
    >
      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Všetky zhody</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{totalMatches}</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Silné zhody</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{strongMatches}</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Stredné zhody</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{mediumMatches}</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Príležitosti so zhodou</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{uniqueLeadCount}</h2>
        </div>
      </section>

      <section className="mb-6">
        <RecalculateMatchesPanel />
      </section>

      {rows.length === 0 ? (
        <EmptyState
          title="Zatiaľ nie sú uložené žiadne matching zhody"
          description="Systém ich začne vytvárať automaticky pri zmene príležitostí a nehnuteľností, alebo klikni na manuálny prepočet."
        />
      ) : (
        <>
          <section className="mb-6">
            <PropertyMatchPanel rows={propertySummary} />
          </section>

          <MatchesTable rows={rows} />
        </>
      )}
    </ModuleShell>
  );
}
