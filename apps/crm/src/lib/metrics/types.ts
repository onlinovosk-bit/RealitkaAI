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
  agency_id: string | null;
  day_utc: string;
  action_count: number | null;
  cost_eur: number | null;
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
  /** Počet dní v okne, ktoré majú aspoň jednu AI akciu. */
  days: number;
  actionCount: number;
  costEur: number;
  /** MRR z computeMrrBreakdown — jediný zdroj pravdy o cenníku. */
  mrrEur: number;
  /**
   * null keď sa marža nedá vypočítať poctivo — pohľad nie je dostupný, alebo
   * AI akcie prebehli, ale ani jedna nemá zapísaný náklad (`costGap`).
   */
  marginEur: number | null;
  /**
   * Akcie za obdobie existujú, ale zapísaný náklad je 0 €. Nie „AI je zadarmo",
   * ale medzera v telemetrii: `logAiAction` dostal `costEur: null`.
   */
  costGap: boolean;
};

export type GuardrailSnapshot = {
  cockpitAttachPct: number | null;
  cockpitAttachBand: GuardrailBand;
  nrrPct: number | null;
  nrrBand: GuardrailBand;
  creditRevenuePct: number | null;
  creditRevenueBand: GuardrailBand;
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
};
