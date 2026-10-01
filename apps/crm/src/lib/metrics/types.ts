import type { GuardrailBand } from "@/lib/metrics/guardrails";

export type AgencyBillingRow = {
  id: string;
  name: string | null;
  seats: number;
  account_tier: string | null;
  manual_plan: string | null;
  owner_cockpit_active: boolean;
  cockpit_tier: string | null;
  subscription_status: string | null;
  billing_source: string | null;
};

export type CreditLedgerRow = {
  delta: number;
  reason: string;
  source: string;
  ref: string | null;
  created_at: string;
};

export type AiCostDailyRow = {
  day_utc: string;
  credits_spent: number;
  cost_eur: number;
  revenue_eur_retail: number;
  margin_eur: number;
};

export type MrrBreakdown = {
  totalEur: number;
  seatRevenueEur: number;
  cockpitRevenueEur: number;
  smolkoManualEur: number;
  smolkoAgencyCount: number;
};

export type CreditActivity = {
  granted: number;
  spent: number;
  purchased: number;
  purchaseRevenueEur: number;
};

export type AiCostSummary = {
  available: boolean;
  days: number;
  creditsSpent: number;
  costEur: number;
  revenueEurRetail: number;
  marginEur: number;
};

export type GuardrailSnapshot = {
  cockpitAttachPct: number | null;
  cockpitAttachBand: GuardrailBand;
  nrrPct: number | null;
  nrrBand: GuardrailBand;
  creditRevenuePct: number | null;
  creditRevenueBand: GuardrailBand;
};

export type MetricTrendSeries = {
  metric: string;
  label: string;
  weekLabels: string[];
  values: (number | null)[];
};

export type FounderMetricsSnapshot = {
  asOf: string;
  periodLabel: string;
  activeSeats: number;
  activeAgencyCount: number;
  cockpitEligibleCount: number;
  cockpitAttachedCount: number;
  cockpitAttachPct: number | null;
  mrr: MrrBreakdown;
  credits: CreditActivity;
  creditRevenuePctOfTotal: number | null;
  aiCost: AiCostSummary;
  guardrails: GuardrailSnapshot;
  trends: MetricTrendSeries[];
  aiCostDailySeries: AiCostDailyRow[];
};
