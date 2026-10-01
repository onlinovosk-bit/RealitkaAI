import { MetricSparkline } from "@/components/metrics/MetricSparkline";
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

function trendFor(metrics: FounderMetricsSnapshot, metricKey: string) {
  return metrics.trends.find((t) => t.metric === metricKey)?.values ?? [];
}

function MetricCard({
  title,
  value,
  detail,
  band,
  trendValues,
  trendColor = "#34d399",
}: {
  title: string;
  value: string;
  detail?: string;
  band?: GuardrailBand;
  trendValues?: (number | null)[];
  trendColor?: string;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${band ? bandClass(band) : "border-slate-700/60 bg-slate-900/60 text-white"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs uppercase tracking-wide opacity-70">{title}</p>
        {trendValues ? <MetricSparkline values={trendValues} color={trendColor} /> : null}
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {detail ? <p className="mt-1 text-sm opacity-80">{detail}</p> : null}
      {band ? <p className="mt-2 text-xs font-medium">{bandLabel(band)}</p> : null}
      {trendValues ? (
        <p className="mt-1 text-[10px] uppercase tracking-wide opacity-50">4 týždne</p>
      ) : null}
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Celkový MRR"
            value={formatEur(mrr.totalEur)}
            trendValues={trendFor(metrics, "mrr_total_eur")}
          />
          <MetricCard title="Seat revenue" value={formatEur(mrr.seatRevenueEur)} />
          <MetricCard title="Owner Cockpit" value={formatEur(mrr.cockpitRevenueEur)} />
          <MetricCard
            title="Smolko manual (199 €)"
            value={formatEur(mrr.smolkoManualEur)}
            detail={`${mrr.smolkoAgencyCount} agentúr · grandfathered`}
          />
        </div>
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
          <MetricCard
            title="Grant"
            value={String(credits.granted)}
            detail="mesačný grant pool"
            trendValues={trendFor(metrics, "credits_granted")}
          />
          <MetricCard
            title="Spend"
            value={String(credits.spent)}
            detail="mínus grant_expiry"
            trendValues={trendFor(metrics, "credits_spent")}
            trendColor="#fbbf24"
          />
          <MetricCard
            title="Purchase"
            value={String(credits.purchased)}
            detail={formatEur(credits.purchaseRevenueEur)}
            trendValues={trendFor(metrics, "credits_purchased")}
            trendColor="#60a5fa"
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
            trendValues={trendFor(metrics, "credit_revenue_pct")}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          AI cost daily
        </h2>
        {aiCost.available ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard title="Dni v okne" value={String(aiCost.days)} />
              <MetricCard
                title="Kredity spent"
                value={String(aiCost.creditsSpent)}
                trendValues={trendFor(metrics, "ai_credits_spent")}
              />
              <MetricCard
                title="Cost EUR"
                value={formatEur(aiCost.costEur)}
                trendValues={trendFor(metrics, "ai_cost_eur")}
                trendColor="#f87171"
              />
              <MetricCard
                title="Margin EUR"
                value={formatEur(aiCost.marginEur)}
                detail={`Retail ${formatEur(aiCost.revenueEurRetail)}`}
                trendValues={trendFor(metrics, "ai_margin_eur")}
              />
            </div>
            {metrics.aiCostDailySeries.length > 0 ? (
              <p className="mt-3 text-xs text-slate-500">
                Denný trend: {metrics.aiCostDailySeries[0]?.day_utc} →{" "}
                {metrics.aiCostDailySeries[metrics.aiCostDailySeries.length - 1]?.day_utc} (
                {metrics.aiCostDailySeries.length} dní)
              </p>
            ) : null}
          </>
        ) : (
          <p className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 text-sm text-slate-400">
            View <code className="text-slate-300">ai_cost_daily</code> nie je dostupná — migrácia
            20260611000004 ešte nebeží v tomto prostredí.
          </p>
        )}
      </section>
    </div>
  );
}
