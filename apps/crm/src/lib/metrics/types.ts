import type { GuardrailBand } from "@/lib/metrics/guardrails";

export type AgencyBillingRow = {
  id: string;
  name: string | null;
  seats: number;
  /** Číta ho `isPayingAgency` — bez neho by interné `Free` tenanty padli medzi platiace. */
  plan: string | null;
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

/** Jedna účtovaná kancelária a dôkaz, na ktorom stojí, že platí. */
export type BilledAgency = {
  id: string;
  name: string | null;
  monthlyEur: number;
  /**
   * Pole, z ktorého `isPayingAgency` odvodil, že kancelária platí — aby sa na
   * dashboarde dalo vidieť, či to stojí na predplatnom, alebo len na názve plánu.
   */
  basis: string;
};

export type MrrBreakdown = {
  totalEur: number;
  officeMonthlyEur: number;
  billedAgencyCount: number;
  billed: BilledAgency[];
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
