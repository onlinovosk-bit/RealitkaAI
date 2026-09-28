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

export type ExpireGrantResult = {
  expired: number;
  skipped: boolean;
  /** Hard failure — caller must not grant this agency in the same cycle. */
  error?: string;
};

type ServiceRoleClient = NonNullable<ReturnType<typeof createServiceRoleClient>>;

async function ledgerHasIdempotencyKey(
  supabase: ServiceRoleClient,
  key: string,
): Promise<{ exists: boolean; error?: string }> {
  const { data, error } = await supabase
    .from("credit_ledger")
    .select("id")
    .eq("idempotency_key", key)
    .maybeSingle();
  if (error) return { exists: false, error: error.message };
  return { exists: Boolean(data) };
}

/**
 * Sweep nevyčerpaných grant kreditov za `periodKey` (zvyčajne previousPeriodKey).
 *
 * Safety: ak už existuje mesačný grant pre *aktuálny* period a expirácia za
 * `periodKey` ešte nie je v ledgeri, odmietneme expire. Inak by retry po
 * partial fail (expire error → grant OK → re-run) vynuloval práve pridelený
 * grant pod zámienkou "exspirácie minulého mesiaca".
 */
export async function expireGrantCreditsForAgency(
  agency: AgencyCreditRow,
  periodKey: string,
  now = new Date(),
): Promise<ExpireGrantResult> {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { expired: 0, skipped: true, error: "service_unavailable" };
  }

  const toExpire = agency.grant_credits_balance;
  if (toExpire <= 0) return { expired: 0, skipped: true };

  const idempotencyKey = grantExpiryIdempotencyKey(agency.id, periodKey);
  const existing = await ledgerHasIdempotencyKey(supabase, idempotencyKey);
  if (existing.error) {
    console.warn("[grant-engine] expiry ledger lookup:", existing.error);
    return { expired: 0, skipped: true, error: existing.error };
  }

  const currentGrantKey = monthlyGrantIdempotencyKey(
    agency.id,
    currentPeriodKey(now),
  );
  const currentGrant = await ledgerHasIdempotencyKey(supabase, currentGrantKey);
  if (currentGrant.error) {
    console.warn("[grant-engine] current grant lookup:", currentGrant.error);
    return { expired: 0, skipped: true, error: currentGrant.error };
  }

  if (existing.exists) {
    // Ledger už má expiry, ale balance ešte nie je 0 → dokonči clear len ak
    // aktuálny grant ešte nebol aplikovaný (inak by sme zmazali nový grant).
    if (toExpire > 0 && !currentGrant.exists) {
      const newTotal = agency.purchased_credits_balance;
      const { error: agencyErr } = await supabase
        .from("agencies")
        .update({
          grant_credits_balance: 0,
          credits_balance: newTotal,
          billing_updated_at: new Date().toISOString(),
        })
        .eq("id", agency.id);
      if (agencyErr) {
        console.warn("[grant-engine] expiry repair agency:", agencyErr.message);
        return { expired: 0, skipped: true, error: agencyErr.message };
      }
      return { expired: toExpire, skipped: false };
    }
    return { expired: 0, skipped: true };
  }

  if (currentGrant.exists) {
    // Safe no-op (not a hard error): wiping now would delete the new monthly grant.
    // Previous-month leftovers stay until a future ops repair — better than zeroing
    // the customer's current pool. Do NOT mark error or credits-cycle would stay red.
    console.error(
      "[grant-engine] refuse expire: current-period grant already applied",
      { agencyId: agency.id, periodKey, currentGrantKey },
    );
    return { expired: 0, skipped: true };
  }

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
    return { expired: 0, skipped: true, error: ledgerErr.message };
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
    return { expired: 0, skipped: true, error: agencyErr.message };
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
