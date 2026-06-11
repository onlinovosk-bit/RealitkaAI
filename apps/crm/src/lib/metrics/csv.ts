import type {
  AiCostDailyRow,
  FounderMetricsSnapshot,
  MetricTrendSeries,
} from "@/lib/metrics/types";

export function escapeCsv(value: string | number | null | undefined): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function founderMetricsSummaryCsv(metrics: FounderMetricsSnapshot): string {
  const headers = [
    "as_of",
    "period",
    "mrr_total_eur",
    "mrr_seat_eur",
    "mrr_cockpit_eur",
    "mrr_smolko_eur",
    "active_seats",
    "active_agencies",
    "cockpit_attach_pct",
    "credits_granted",
    "credits_spent",
    "credits_purchased",
    "credit_purchase_revenue_eur",
    "credit_revenue_pct",
    "ai_cost_available",
    "ai_days",
    "ai_credits_spent",
    "ai_cost_eur",
    "ai_revenue_eur",
    "ai_margin_eur",
  ];

  const { mrr, credits, aiCost } = metrics;
  const row = [
    metrics.asOf,
    metrics.periodLabel,
    mrr.totalEur,
    mrr.seatRevenueEur,
    mrr.cockpitRevenueEur,
    mrr.smolkoManualEur,
    metrics.activeSeats,
    metrics.activeAgencyCount,
    metrics.cockpitAttachPct ?? "",
    credits.granted,
    credits.spent,
    credits.purchased,
    credits.purchaseRevenueEur,
    metrics.creditRevenuePctOfTotal ?? "",
    aiCost.available,
    aiCost.days,
    aiCost.creditsSpent,
    aiCost.costEur,
    aiCost.revenueEurRetail,
    aiCost.marginEur,
  ];

  return [headers.join(","), row.map(escapeCsv).join(",")].join("\n");
}

export function aiCostDailyCsv(rows: AiCostDailyRow[]): string {
  const headers = ["day_utc", "credits_spent", "cost_eur", "revenue_eur_retail", "margin_eur"];
  const lines = rows.map((r) =>
    [r.day_utc, r.credits_spent, r.cost_eur, r.revenue_eur_retail, r.margin_eur]
      .map(escapeCsv)
      .join(","),
  );
  return [headers.join(","), ...lines].join("\n");
}

export function metricsTrendsCsv(trends: MetricTrendSeries[]): string {
  if (trends.length === 0) return "metric,label\n";

  const weekHeaders = trends[0]!.weekLabels.map((_, i) => `week_${i + 1}`);
  const headers = ["metric", "label", ...weekHeaders];

  const lines = trends.map((t) =>
    [t.metric, t.label, ...t.values.map((v) => (v == null ? "" : v))]
      .map(escapeCsv)
      .join(","),
  );

  return [headers.join(","), ...lines].join("\n");
}
