import { COCKPIT_LITE_MIN_SEATS, TOPUP_PACKAGES } from "@/lib/program-tier-pricing";
import {
  bandCockpitAttach,
  bandCreditRevenuePct,
  bandNrr,
} from "@/lib/metrics/guardrails";
import type {
  AgencyBillingRow,
  BilledAgency,
  AiCostDailyRow,
  AiCostSummary,
  CreditActivity,
  CreditLedgerRow,
  FounderMetricsSnapshot,
  MrrBreakdown,
} from "@/lib/metrics/types";

/**
 * Kanonická cena (DEC-20260924-001): 199 € za kanceláriu mesačne, bez kreditov,
 * onboarding 0 €. Nahrádza seat model 79 / 71 / 63 € (DEC-20260921-001), ktorý
 * ostáva archivovaný v `program-tier-pricing.ts`.
 */
export const OFFICE_MONTHLY_EUR = 199;

/**
 * Prečo sa kancelária počíta ako platiaca — v presnom poradí, v akom to
 * vyhodnocuje `isPayingAgency`. Vracia `null`, keď neplatí.
 *
 * Existuje kvôli dashboardu: nie každý dôkaz je rovnako silný. `subscription`
 * je záznam o predplatnom, `plan` alebo `account_tier` je len názov balíka, ktorý
 * niekto nastavil. Founder musí vidieť rozdiel, nie súčet.
 *
 * JEDEN ZÁMERNÝ ROZDIEL oproti `isPayingAgency`: zrušené predplatné.
 * `isPayingAgency` vráti `true` aj pre kanceláriu so `subscription_status =
 * 'canceled'`, ak jej ostal nenulový `plan` alebo `account_tier` — na zrušenie
 * sa nepozerá vôbec. Pre zdravotný scan je to neškodné, pre tržbu nie: každá
 * odídená kancelária s dožívajúcim názvom balíka by pridala 199 € mesačne.
 * MRR sa preto pýta na zrušenie ako na prvé. (Na dnešných produkčných dátach
 * nemá `canceled` ani jedna kancelária, takže číslo sa tým nemení — je to
 * poistka, nie oprava dnešného stavu. Samotný `isPayingAgency` nemením;
 * to je zásah do `customer-health` a patrí do vlastného rozhodnutia.)
 */
export function payingBasis(row: AgencyBillingRow): string | null {
  const status = (row.subscription_status ?? "").trim().toLowerCase();
  if (status === "canceled" || status === "cancelled" || status === "inactive") {
    return null;
  }
  if ((row.manual_plan ?? "").trim()) return `manual_plan=${row.manual_plan!.trim()}`;
  if (status === "active" || status === "trialing") return `subscription_status=${status}`;
  const plan = (row.plan ?? "").trim();
  if (plan && plan.toLowerCase() !== "free") return `plan=${plan}`;
  const tier = (row.account_tier ?? "").trim();
  if (tier && tier.toLowerCase() !== "free") return `account_tier=${tier}`;
  return null;
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

/**
 * MRR = 199 € × počet platiacich kancelárií.
 *
 * Násobiteľ je `isPayingAgency` (`lib/customer-health/paid.ts`), nie
 * `isAgencyActive`. Tie dva predikáty nie sú to isté: prvý znamená „platí nám",
 * druhý „nie je vypnutá". Dnes sa na produkčných dátach zhodujú na tých istých
 * troch kanceláriách, ale zhodovať sa nemusia — a tržbu smie určovať len ten
 * prvý. Interné `Revolis Demo / Sandbox / System` majú `plan = 'Free'`, takže
 * ich `isPayingAgency` správne vynecháva.
 *
 * Seaty a Owner Cockpit sa do MRR nepočítajú — v modeli 199 €/kancelária
 * neexistujú ako samostatné položky. `computeActiveSeats` a
 * `computeCockpitAttach` ostávajú ako prevádzkové metriky, nie tržbové.
 */
export function computeMrrBreakdown(agencies: AgencyBillingRow[]): MrrBreakdown {
  const billed: BilledAgency[] = [];

  for (const row of agencies) {
    const basis = payingBasis(row);
    if (!basis) continue;
    billed.push({
      id: row.id,
      name: row.name,
      monthlyEur: OFFICE_MONTHLY_EUR,
      basis,
    });
  }

  return {
    totalEur: OFFICE_MONTHLY_EUR * billed.length,
    officeMonthlyEur: OFFICE_MONTHLY_EUR,
    billedAgencyCount: billed.length,
    billed,
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

/**
 * AI náklad za obdobie a marža voči MRR.
 *
 * Tržbu NEPOČÍTA z `ai_cost_daily` — ten pohľad nesie len skutočný náklad.
 * Marža vychádza z `computeMrrBreakdown()`, aby cenník žil na jednom mieste.
 * Okno je to isté mesačné okno ako pri kreditoch, aby sa mesačné MRR
 * porovnávalo s mesačným nákladom, nie s 62-dňovým.
 */
export function computeAiCostSummary(
  rows: AiCostDailyRow[],
  available: boolean,
  mrrTotalEur: number,
  periodStart: Date,
  periodEnd: Date,
): AiCostSummary {
  if (!available) {
    return {
      available: false,
      days: 0,
      actionCount: 0,
      costEur: 0,
      mrrEur: mrrTotalEur,
      marginEur: null,
      costGap: false,
    };
  }

  const inPeriod = rows.filter((row) => {
    const day = new Date(`${row.day_utc}T00:00:00.000Z`);
    return day >= periodStart && day < periodEnd;
  });

  const costEur =
    Math.round(inPeriod.reduce((s, r) => s + Number(r.cost_eur ?? 0), 0) * 100) / 100;

  const actionCount = inPeriod.reduce((s, r) => s + Number(r.action_count ?? 0), 0);

  // Akcie prebehli, ale ani jedna nemá zapísaný náklad. Marža MRR − 0 by
  // tvrdila, že AI nič nestojí; to je nepravda, nie meranie.
  const costGap = actionCount > 0 && costEur === 0;

  return {
    available: true,
    days: new Set(inPeriod.map((r) => r.day_utc)).size,
    actionCount,
    costEur,
    mrrEur: mrrTotalEur,
    marginEur: costGap ? null : Math.round((mrrTotalEur - costEur) * 100) / 100,
    costGap,
  };
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
  const aiCost = computeAiCostSummary(
    input.aiCostDaily,
    input.aiCostDailyAvailable,
    mrr.totalEur,
    start,
    end,
  );

  const activeAgencyCount = input.agencies.filter(isAgencyActive).length;

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
  };
}
