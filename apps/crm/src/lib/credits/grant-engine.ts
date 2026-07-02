import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  grantExpiryIdempotencyKey,
  monthlyGrantIdempotencyKey,
} from "@/lib/credits/grant-idempotency";
import {
  COCKPIT_PRODUCTS,
  CREDIT_GRANTS,
  monthlyAgencyGrantCredits,
  type SeatTier,
} from "@/lib/program-tier-pricing";

export type CreditLedgerSource = "grant" | "purchase";

export type AgencyCreditRow = {
  id: string;
  seats: number;
  account_tier: string | null;
  grant_credits_balance: number;
  purchased_credits_balance: number;
  owner_cockpit_active: boolean;
  credits_balance: number;
};

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

/** Idempotentný mesačný grant (1. deň mesiaca). */
export async function grantMonthlyCreditsForAgency(
  agency: AgencyCreditRow,
  periodKey: string,
): Promise<{ granted: number; skipped: boolean }> {
  const supabase = createServiceRoleClient();
  if (!supabase) return { granted: 0, skipped: true };

  const seatTier = seatTierFromAccountTier(agency.account_tier);
  const seatCount = Math.max(0, agency.seats);
  const amount = monthlyAgencyGrantCredits({
    seatTier,
    seatCount,
    ownerCockpitActive: agency.owner_cockpit_active,
  });

  if (amount <= 0) return { granted: 0, skipped: true };

  const idempotencyKey = monthlyGrantIdempotencyKey(agency.id, periodKey);
  const { data: existing } = await supabase
    .from("credit_ledger")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing) return { granted: 0, skipped: true };

  const newGrantBalance = agency.grant_credits_balance + amount;
  const newTotal = newGrantBalance + agency.purchased_credits_balance;

  const { error: ledgerErr } = await supabase.from("credit_ledger").insert({
    agency_id: agency.id,
    delta: amount,
    reason: "monthly_grant",
    ref: periodKey,
    idempotency_key: idempotencyKey,
    source: "grant" satisfies CreditLedgerSource,
  });

  if (ledgerErr) {
    console.warn("[grant-engine] ledger insert:", ledgerErr.message);
    return { granted: 0, skipped: true };
  }

  const { error: agencyErr } = await supabase
    .from("agencies")
    .update({
      grant_credits_balance: newGrantBalance,
      credits_balance: newTotal,
      billing_updated_at: new Date().toISOString(),
    })
    .eq("id", agency.id);

  if (agencyErr) {
    console.warn("[grant-engine] agency update:", agencyErr.message);
    return { granted: 0, skipped: true };
  }

  return { granted: amount, skipped: false };
}

/** Sweep nevyčerpaných grant kreditov na konci mesiaca. */
export async function expireGrantCreditsForAgency(
  agency: AgencyCreditRow,
  periodKey: string,
): Promise<{ expired: number; skipped: boolean }> {
  const supabase = createServiceRoleClient();
  if (!supabase) return { expired: 0, skipped: true };

  const toExpire = agency.grant_credits_balance;
  if (toExpire <= 0) return { expired: 0, skipped: true };

  const idempotencyKey = grantExpiryIdempotencyKey(agency.id, periodKey);
  const { data: existing } = await supabase
    .from("credit_ledger")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing) return { expired: 0, skipped: true };

  const newTotal = agency.purchased_credits_balance;

  const { error: ledgerErr } = await supabase.from("credit_ledger").insert({
    agency_id: agency.id,
    delta: -toExpire,
    reason: "grant_expiry",
    ref: periodKey,
    idempotency_key: idempotencyKey,
    source: "grant" satisfies CreditLedgerSource,
  });

  if (ledgerErr) {
    console.warn("[grant-engine] expiry ledger:", ledgerErr.message);
    return { expired: 0, skipped: true };
  }

  const { error: agencyErr } = await supabase
    .from("agencies")
    .update({
      grant_credits_balance: 0,
      credits_balance: newTotal,
      billing_updated_at: new Date().toISOString(),
    })
    .eq("id", agency.id);

  if (agencyErr) {
    console.warn("[grant-engine] expiry agency:", agencyErr.message);
    return { expired: 0, skipped: true };
  }

  return { expired: toExpire, skipped: false };
}

export function currentPeriodKey(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

export function previousPeriodKey(d = new Date()): string {
  const prev = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
  return currentPeriodKey(prev);
}

/** Odhad mesačného grantu pre reporting (bez DB). */
export function previewMonthlyGrant(seatTier: SeatTier, seats: number, ownerCockpit: boolean): number {
  return monthlyAgencyGrantCredits({
    seatTier,
    seatCount: seats,
    ownerCockpitActive: ownerCockpit,
  });
}

export function cockpitGrantAmount(): number {
  return COCKPIT_PRODUCTS.owner.grantCredits;
}

export function seatGrantPerSeat(tier: SeatTier): number {
  return CREDIT_GRANTS[tier];
}
