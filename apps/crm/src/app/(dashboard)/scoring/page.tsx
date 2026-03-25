import ModuleShell from "@/components/shared/module-shell";
import EmptyState from "@/components/shared/empty-state";
import ErrorState from "@/components/shared/error-state";
import LockedFeatureCard from "@/components/shared/locked-feature-card";
import FeatureGateBanner from "@/components/shared/feature-gate-banner";
import RecalculateScoringPanel from "@/components/scoring/recalculate-scoring-panel";
import ScoringTopLeadsTable from "@/components/scoring/scoring-top-leads-table";
import ScoringInsightsPanel from "@/components/scoring/scoring-insights-panel";
import { safeServerAction } from "@/lib/safe-action";
import { calculateAllLeadScores } from "@/lib/ai-scoring-store";
import { listLeads } from "@/lib/leads-store";
import { requireRole } from "@/lib/permissions";
import { getFeatureGateState } from "@/lib/feature-gating";

export default async function ScoringPage() {
  await requireRole(["owner", "manager", "agent"]);

  const gate = await getFeatureGateState("aiScoring");

  if (!gate.enabled) {
    return (
      <ModuleShell
        title="AI Scoring"
        description="Lepšie score, prioritizácia podľa správania a silnejšie odporúčania pre maklérov."
      >
        <LockedFeatureCard
          title="AI Scoring je zamknutý"
          description={gate.reason || "AI Scoring nie je dostupný pre aktuálny plán."}
        />
      </ModuleShell>
    );
  }

  const result = await safeServerAction(
    async () => {
      const [scores, leads] = await Promise.all([
        calculateAllLeadScores(),
        listLeads(),
      ]);

      return { scores, leads };
    },
    "Nepodarilo sa načítať AI scoring."
  );

  if (!result.ok) {
    return (
      <ModuleShell
        title="AI Scoring"
        description="Lepšie score, prioritizácia podľa správania a silnejšie odporúčania pre maklérov."
      >
        <ErrorState
          title="AI Scoring sa nepodarilo načítať"
          description={result.error}
        />
      </ModuleShell>
    );
  }

  const { scores, leads } = result.data;

  const rows = scores.map((item) => {
    const lead = leads.find((row) => row.id === item.leadId);

    return {
      ...item,
      leadName: lead?.name ?? item.leadId,
    };
  });

  const criticalCount = rows.filter((item) => item.band === "critical").length;
  const highCount = rows.filter((item) => item.band === "high").length;
  const riskCount = rows.filter((item) => item.riskLevel === "risk").length;
  const opportunityCount = rows.filter((item) => item.riskLevel === "opportunity").length;

  return (
    <ModuleShell
      title="AI Scoring"
      description="Lepšie score, prioritizácia podľa správania a silnejšie odporúčania pre maklérov."
    >
      <FeatureGateBanner description="AI Scoring je aktivovaný v tvojom pláne." title="AI Scoring je aktívny" />

      <section className="mt-6 mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Critical leady</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{criticalCount}</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">High leady</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{highCount}</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Risk leady</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{riskCount}</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Opportunity leady</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{opportunityCount}</h2>
        </div>
      </section>

      <section className="mb-6">
        <RecalculateScoringPanel />
      </section>

      {rows.length === 0 ? (
        <EmptyState
          title="Zatiaľ nie sú dostupné žiadne scoring výsledky"
          description={'Klikni na "Prepočítať scoring" a systém vyhodnotí leady podľa AI Scoring 2.0.'}
        />
      ) : (
        <>
          <section className="mb-6">
            <ScoringTopLeadsTable rows={rows.slice(0, 20)} />
          </section>

          <ScoringInsightsPanel rows={rows.slice(0, 8)} />
        </>
      )}
    </ModuleShell>
  );
}
