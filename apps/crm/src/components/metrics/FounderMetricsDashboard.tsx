import type { GuardrailBand } from "@/lib/metrics/guardrails";
import type { FounderMetricsSnapshot } from "@/lib/metrics/types";

function formatEur(value: number): string {
  return `${value.toLocaleString("sk-SK", { maximumFractionDigits: 0 })} €`;
}

function bandClass(band: GuardrailBand): string {
  switch (band) {
    case "pass":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "warn":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    case "fail":
      return "border-red-500/40 bg-red-500/10 text-red-300";
    default:
      return "border-slate-500/40 bg-slate-500/10 text-slate-400";
  }
}

function bandLabel(band: GuardrailBand): string {
  switch (band) {
    case "pass":
      return "V pásme";
    case "warn":
      return "Blízko hrany";
    case "fail":
      return "Mimo pásma";
    default:
      return "N/A";
  }
}

function MetricCard({
  title,
  value,
  detail,
  band,
}: {
  title: string;
  value: string;
  detail?: string;
  band?: GuardrailBand;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${band ? bandClass(band) : "border-slate-700/60 bg-slate-900/60 text-white"}`}
    >
      <p className="text-xs uppercase tracking-wide opacity-70">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {detail ? <p className="mt-1 text-sm opacity-80">{detail}</p> : null}
      {band ? <p className="mt-2 text-xs font-medium">{bandLabel(band)}</p> : null}
    </div>
  );
}

export default function FounderMetricsDashboard({
  metrics,
}: {
  metrics: FounderMetricsSnapshot;
}) {
  const { mrr, credits, guardrails, aiCost } = metrics;

  return (
    <div className="space-y-8" data-testid="founder-metrics-dashboard">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          MRR odhad · {metrics.periodLabel}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            title="Celkový MRR"
            value={formatEur(mrr.totalEur)}
            detail={`${mrr.billedAgencyCount} × ${formatEur(mrr.officeMonthlyEur)}`}
          />
          <MetricCard
            title="Platiace kancelárie"
            value={String(mrr.billedAgencyCount)}
            detail="bez kreditov, onboarding 0 €"
          />
          <MetricCard
            title="Cena za kanceláriu"
            value={formatEur(mrr.officeMonthlyEur)}
            detail="mesačne s DPH"
          />
        </div>

        {mrr.billed.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-700/60">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Kancelária</th>
                  <th className="px-4 py-2 font-medium">Na čom stojí, že platí</th>
                  <th className="px-4 py-2 text-right font-medium">Mesačne</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                {mrr.billed.map((agency) => (
                  <tr key={agency.id}>
                    <td className="px-4 py-2 text-white">{agency.name ?? agency.id}</td>
                    <td className="px-4 py-2">
                      <code className="text-xs text-slate-400">{agency.basis}</code>
                    </td>
                    <td className="px-4 py-2 text-right text-white">
                      {formatEur(agency.monthlyEur)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Operácia
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            title="Aktívne seaty"
            value={String(metrics.activeSeats)}
            detail={`${metrics.activeAgencyCount} agentúr`}
          />
          <MetricCard
            title="Cockpit attach"
            value={metrics.cockpitAttachPct != null ? `${metrics.cockpitAttachPct} %` : "—"}
            detail={`${metrics.cockpitAttachedCount} / ${metrics.cockpitEligibleCount} eligible (3+ seaty)`}
            band={guardrails.cockpitAttachBand}
          />
          <MetricCard
            title="NRR"
            value="—"
            detail="Vyžaduje historický MRR — zatiaľ nedostupné"
            band={guardrails.nrrBand}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Kredity · {metrics.periodLabel}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Grant" value={String(credits.granted)} detail="mesačný grant pool" />
          <MetricCard title="Spend" value={String(credits.spent)} detail="mínus grant_expiry" />
          <MetricCard
            title="Purchase"
            value={String(credits.purchased)}
            detail={formatEur(credits.purchaseRevenueEur)}
          />
          <MetricCard
            title="Credit revenue %"
            value={
              metrics.creditRevenuePctOfTotal != null
                ? `${metrics.creditRevenuePctOfTotal} %`
                : "—"
            }
            detail="top-up / (MRR + top-up)"
            band={guardrails.creditRevenueBand}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          AI náklad tento mesiac
        </h2>
        {aiCost.available ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Dni s AI aktivitou" value={String(aiCost.days)} />
            <MetricCard title="AI akcií" value={String(aiCost.actionCount)} />
            <MetricCard
              title="AI náklad"
              value={formatEur(aiCost.costEur)}
              detail="skutočné OpenAI tokeny"
            />
            <MetricCard
              title="Marža"
              value={aiCost.marginEur == null ? "—" : formatEur(aiCost.marginEur)}
              detail={
                aiCost.costGap
                  ? "náklad sa nezapisuje — logAiAction dostáva costEur: null"
                  : `MRR ${formatEur(aiCost.mrrEur)} − AI náklad`
              }
            />
          </div>
        ) : (
          <p className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 text-sm text-slate-400">
            View <code className="text-slate-300">ai_cost_daily</code> nie je dostupná — migrácia
            20260924200000 ešte nebeží v tomto prostredí.
          </p>
        )}
      </section>
    </div>
  );
}
