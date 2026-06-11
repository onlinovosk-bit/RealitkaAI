import {
  COCKPIT_LITE_MIN_SEATS,
  COCKPIT_PRODUCTS,
  SEAT_TIER_CONFIG,
  TOPUP_PACKAGES,
  type SeatTier,
} from "@/lib/program-tier-pricing";
import {
  bandCockpitAttach,
  bandCreditRevenuePct,
  bandNrr,
} from "@/lib/metrics/guardrails";
import {
  aggregateAiCostWeek,
  fourWeekBuckets,
  sortAiCostDailyAsc,
} from "@/lib/metrics/trends";
import type {
  AgencyBillingRow,
  AiCostDailyRow,
  AiCostSummary,
  CreditActivity,
  CreditLedgerRow,
  FounderMetricsSnapshot,
  MetricTrendSeries,
  MrrBreakdown,
} from "@/lib/metrics/types";

export const SMOLKO_MANUAL_PLAN_MRR_EUR = 199;

function seatTierFromAccountTier(accountTier: string | null): SeatTier {
  switch (accountTier) {
    case "starter":
    case "free":
      return "solo";
    case "enterprise":
    case "market_vision":
      return "office";
    case "pro":
    case "active_force":
    default:
      return "team";
  }
}

function isAgencyActive(row: AgencyBillingRow): boolean {
  const status = (row.subscription_status ?? "").toLowerCase();
  if (status === "canceled" || status === "cancelled" || status === "inactive") {
    return false;
  }
  if (status === "active" || status === "trialing") return true;
  if (row.manual_plan) return true;
  if ((row.seats ?? 0) > 0 && row.billing_source === "stripe") return true;
  return false;
}

function isSmolkoManual(row: AgencyBillingRow): boolean {
  return (row.manual_plan ?? "").trim().toLowerCase() === "market_vision";
}

/** MRR estimate — Smolko manual_plan on separate line at 199 €. */
export function computeMrrBreakdown(agencies: AgencyBillingRow[]): MrrBreakdown {
  let seatRevenueEur = 0;
  let cockpitRevenueEur = 0;
  let smolkoManualEur = 0;
  let smolkoAgencyCount = 0;

  for (const row of agencies) {
    if (!isAgencyActive(row)) continue;

    if (isSmolkoManual(row)) {
      smolkoManualEur += SMOLKO_MANUAL_PLAN_MRR_EUR;
      smolkoAgencyCount += 1;
      continue;
    }

    const tier = seatTierFromAccountTier(row.account_tier);
    const seats = Math.max(0, row.seats ?? 0);
    seatRevenueEur += seats * SEAT_TIER_CONFIG[tier].priceEur;

    if (row.owner_cockpit_active) {
      cockpitRevenueEur += COCKPIT_PRODUCTS.owner.priceEur;
    }
  }

  return {
    totalEur: seatRevenueEur + cockpitRevenueEur + smolkoManualEur,
    seatRevenueEur,
    cockpitRevenueEur,
    smolkoManualEur,
    smolkoAgencyCount,
  };
}

export function computeActiveSeats(agencies: AgencyBillingRow[]): number {
  return agencies
    .filter(isAgencyActive)
    .reduce((sum, row) => sum + Math.max(0, row.seats ?? 0), 0);
}

export function computeCockpitAttach(agencies: AgencyBillingRow[]): {
  eligible: number;
  attached: number;
  pct: number | null;
} {
  const active = agencies.filter(isAgencyActive);
  const eligible = active.filter((row) => (row.seats ?? 0) >= COCKPIT_LITE_MIN_SEATS);
  const attached = eligible.filter(
    (row) => row.owner_cockpit_active || row.cockpit_tier === "owner",
  );
  const pct =
    eligible.length > 0 ? Math.round((attached.length / eligible.length) * 1000) / 10 : null;
  return { eligible: eligible.length, attached: attached.length, pct };
}

function topupRevenueEur(ref: string | null): number {
  const key = (ref ?? "").trim().toLowerCase();
  const pkg = TOPUP_PACKAGES[key as keyof typeof TOPUP_PACKAGES];
  return pkg?.priceEur ?? 0;
}

/** Credits grant / spend / purchase for a UTC month window. */
export function computeCreditActivity(
  ledger: CreditLedgerRow[],
  periodStart: Date,
  periodEnd: Date,
): CreditActivity {
  let granted = 0;
  let spent = 0;
  let purchased = 0;
  let purchaseRevenueEur = 0;

  for (const row of ledger) {
    const at = new Date(row.created_at);
    if (at < periodStart || at >= periodEnd) continue;

    const delta = row.delta ?? 0;
    const reason = (row.reason ?? "").toLowerCase();

    if (reason === "monthly_grant" || (delta > 0 && row.source === "grant")) {
      granted += delta;
      continue;
    }

    if (reason === "credit_topup" || (delta > 0 && row.source === "purchase")) {
      purchased += delta;
      purchaseRevenueEur += topupRevenueEur(row.ref);
      continue;
    }

    if (delta < 0 && reason !== "grant_expiry") {
      spent += Math.abs(delta);
    }
  }

  return { granted, spent, purchased, purchaseRevenueEur };
}

export function computeCreditRevenuePct(
  mrrTotalEur: number,
  purchaseRevenueEur: number,
): number | null {
  const total = mrrTotalEur + purchaseRevenueEur;
  if (total <= 0) return null;
  return Math.round((purchaseRevenueEur / total) * 1000) / 10;
}

export function computeAiCostSummary(
  rows: AiCostDailyRow[],
  available: boolean,
): AiCostSummary {
  if (!available) {
    return {
      available: false,
      days: 0,
      creditsSpent: 0,
      costEur: 0,
      revenueEurRetail: 0,
      marginEur: 0,
    };
  }

  const creditsSpent = rows.reduce((s, r) => s + (r.credits_spent ?? 0), 0);
  const costEur = rows.reduce((s, r) => s + Number(r.cost_eur ?? 0), 0);
  const revenueEurRetail = rows.reduce((s, r) => s + Number(r.revenue_eur_retail ?? 0), 0);
  const marginEur = rows.reduce((s, r) => s + Number(r.margin_eur ?? 0), 0);

  return {
    available: true,
    days: rows.length,
    creditsSpent,
    costEur: Math.round(costEur * 100) / 100,
    revenueEurRetail: Math.round(revenueEurRetail * 100) / 100,
    marginEur: Math.round(marginEur * 100) / 100,
  };
}

function trendSeries(
  metric: string,
  label: string,
  weekLabels: string[],
  values: (number | null)[],
): MetricTrendSeries {
  return { metric, label, weekLabels, values };
}

/** Mini 4-week trends — credits + AI cost from time series; MRR snapshot on latest week only. */
export function computeFourWeekTrends(input: {
  agencies: AgencyBillingRow[];
  ledger: CreditLedgerRow[];
  aiCostDaily: AiCostDailyRow[];
  aiCostDailyAvailable: boolean;
  asOf?: Date;
}): MetricTrendSeries[] {
  const asOf = input.asOf ?? new Date();
  const buckets = fourWeekBuckets(asOf);
  const weekLabels = buckets.map((b) => b.label);
  const snapshotMrr = computeMrrBreakdown(input.agencies).totalEur;

  const creditsGranted: (number | null)[] = [];
  const creditsSpent: (number | null)[] = [];
  const creditsPurchased: (number | null)[] = [];
  const creditRevenuePct: (number | null)[] = [];
  const aiCreditsSpent: (number | null)[] = [];
  const aiCostEur: (number | null)[] = [];
  const aiMarginEur: (number | null)[] = [];
  const mrrTrend: (number | null)[] = [];

  buckets.forEach((bucket, index) => {
    const isLatest = index === buckets.length - 1;
    const credit = computeCreditActivity(input.ledger, bucket.start, bucket.end);
    creditsGranted.push(credit.granted);
    creditsSpent.push(credit.spent);
    creditsPurchased.push(credit.purchased);
    creditRevenuePct.push(computeCreditRevenuePct(snapshotMrr, credit.purchaseRevenueEur));
    mrrTrend.push(isLatest ? snapshotMrr : null);

    if (input.aiCostDailyAvailable) {
      const ai = aggregateAiCostWeek(input.aiCostDaily, bucket.start, bucket.end);
      aiCreditsSpent.push(ai.creditsSpent);
      aiCostEur.push(ai.costEur);
      aiMarginEur.push(ai.marginEur);
    } else {
      aiCreditsSpent.push(null);
      aiCostEur.push(null);
      aiMarginEur.push(null);
    }
  });

  const result: MetricTrendSeries[] = [
    trendSeries("mrr_total_eur", "MRR celkom", weekLabels, mrrTrend),
    trendSeries("credits_granted", "Kredity grant", weekLabels, creditsGranted),
    trendSeries("credits_spent", "Kredity spend", weekLabels, creditsSpent),
    trendSeries("credits_purchased", "Kredity purchase", weekLabels, creditsPurchased),
    trendSeries("credit_revenue_pct", "Credit revenue %", weekLabels, creditRevenuePct),
  ];

  if (input.aiCostDailyAvailable) {
    result.push(
      trendSeries("ai_credits_spent", "AI kredity spent", weekLabels, aiCreditsSpent),
      trendSeries("ai_cost_eur", "AI cost EUR", weekLabels, aiCostEur),
      trendSeries("ai_margin_eur", "AI margin EUR", weekLabels, aiMarginEur),
    );
  }

  return result;
}

export function monthUtcBounds(reference: Date): { start: Date; end: Date; label: string } {
  const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
  const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1));
  const label = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
  return { start, end, label };
}

export function computeFounderMetrics(input: {
  agencies: AgencyBillingRow[];
  ledger: CreditLedgerRow[];
  aiCostDaily: AiCostDailyRow[];
  aiCostDailyAvailable: boolean;
  asOf?: Date;
}): FounderMetricsSnapshot {
  const asOf = input.asOf ?? new Date();
  const { start, end, label } = monthUtcBounds(asOf);

  const mrr = computeMrrBreakdown(input.agencies);
  const activeSeats = computeActiveSeats(input.agencies);
  const cockpit = computeCockpitAttach(input.agencies);
  const credits = computeCreditActivity(input.ledger, start, end);
  const creditRevenuePctOfTotal = computeCreditRevenuePct(mrr.totalEur, credits.purchaseRevenueEur);
  const aiCost = computeAiCostSummary(input.aiCostDaily, input.aiCostDailyAvailable);

  const activeAgencyCount = input.agencies.filter(isAgencyActive).length;

  const trends = computeFourWeekTrends({
    agencies: input.agencies,
    ledger: input.ledger,
    aiCostDaily: input.aiCostDaily,
    aiCostDailyAvailable: input.aiCostDailyAvailable,
    asOf,
  });

  return {
    asOf: asOf.toISOString(),
    periodLabel: label,
    activeSeats,
    activeAgencyCount,
    cockpitEligibleCount: cockpit.eligible,
    cockpitAttachedCount: cockpit.attached,
    cockpitAttachPct: cockpit.pct,
    mrr,
    credits,
    creditRevenuePctOfTotal,
    aiCost,
    guardrails: {
      cockpitAttachPct: cockpit.pct,
      cockpitAttachBand: bandCockpitAttach(cockpit.pct),
      nrrPct: null,
      nrrBand: bandNrr(null),
      creditRevenuePct: creditRevenuePctOfTotal,
      creditRevenueBand: bandCreditRevenuePct(creditRevenuePctOfTotal),
    },
    trends,
    aiCostDailySeries: input.aiCostDailyAvailable
      ? sortAiCostDailyAsc(input.aiCostDaily)
      : [],
  };
}
