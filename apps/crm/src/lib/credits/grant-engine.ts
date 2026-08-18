import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  grantExpiryIdempotencyKey,
  monthlyGrantIdempotencyKey,
} from "@/lib/credits/grant-idempotency";
import {
  applyMonthlyGrantCredits,
  expireGrantCreditsAtomic,
} from "@/lib/credits/mutate-credits";
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

/** Idempotentný mesačný grant (1. deň mesiaca) — atomický RPC s FOR UPDATE. */
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
  const result = await applyMonthlyGrantCredits({
    agencyId: agency.id,
    amount,
    periodKey,
    idempotencyKey,
  });

  if (!result.ok) {
    console.warn("[grant-engine] monthly grant:", result.error);
    return { granted: 0, skipped: true };
  }
  if (result.skipped) return { granted: 0, skipped: true };
  return { granted: result.granted ?? amount, skipped: false };
}

/** Sweep nevyčerpaných grant kreditov — atomický RPC (neprepíše purchased). */
export async function expireGrantCreditsForAgency(
  agency: AgencyCreditRow,
  periodKey: string,
): Promise<{ expired: number; skipped: boolean }> {
  const supabase = createServiceRoleClient();
  if (!supabase) return { expired: 0, skipped: true };

  // Rýchly skip bez RPC, keď snapshot už ukazuje nulu (cron filter .gt grant).
  if (agency.grant_credits_balance <= 0) return { expired: 0, skipped: true };

  const idempotencyKey = grantExpiryIdempotencyKey(agency.id, periodKey);
  const result = await expireGrantCreditsAtomic({
    agencyId: agency.id,
    periodKey,
    idempotencyKey,
  });

  if (!result.ok) {
    console.warn("[grant-engine] expiry:", result.error);
    return { expired: 0, skipped: true };
  }
  if (result.skipped) return { expired: 0, skipped: true };
  return { expired: result.expired ?? 0, skipped: false };
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
