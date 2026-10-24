import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  grantExpiryIdempotencyKey,
  monthlyGrantIdempotencyKey,
} from "@/lib/credits/grant-idempotency";
import {
  applyMonthlyGrantCredits,
  expireGrantCreditsAtomic,
} from "@/lib/credits/mutate-credits";
import { monthlyOfficeGrantCredits, resolvePricingV2BandResult, PRICING_V2_BAND_IDS, type PricingV2BandId } from "@/lib/pricing-v2";
import { PRICING_V2_AGENCY_MODEL } from "@/lib/pricing-v2-contract";
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
  /**
   * Cenník v2 (voliteľné: legacy riadky tieto polia nemajú). `pricing_model = 'v2'` prepne
   * výpočet grantu na kredity pásma + pack_credits a podmieni ho `subscription_status = 'active'`.
   */
  pricing_model?: string | null;
  pricing_band?: string | null;
  /** Cenník v3: počet maklérov (= quantity licencie). Pásmo grantu sa odvodzuje z neho. */
  licensed_users?: number | null;
  pack_credits?: number | null;
  subscription_status?: string | null;
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

/**
 * Pásmo pre grant (v3): odvodené z `licensed_users` (1 / 2–5 / 6–10 / 11+). Ak `licensed_users` chýba
 * (riadok bez tohto stĺpca), použije sa uložené `pricing_band`. Neplatná hodnota = null (grant 0).
 */
function grantBandOf(agency: AgencyCreditRow): PricingV2BandId | null {
  if (agency.licensed_users !== null && agency.licensed_users !== undefined) {
    const r = resolvePricingV2BandResult(agency.licensed_users);
    return r.ok ? r.band.id : null;
  }
  const band = agency.pricing_band;
  return band && (PRICING_V2_BAND_IDS as readonly string[]).includes(band) ? (band as PricingV2BandId) : null;
}

/**
 * Mesačný grant agentúry v kreditoch (čistá funkcia, bez DB).
 *
 * v2/v3: kredity pásma (z licensed_users) + pack_credits, a to LEN pri subscription_status = 'active'.
 * Neznáme pásmo alebo iný pricing_model než v2 = 0 (fail-closed), nikdy nie legacy seat výpočet:
 * v2 agentúra má seats = povolení používatelia a legacy výpočet by jej dal „team“ grant × seaty.
 * Legacy (pricing_model NULL/chýba): výpočet nezmenený, subscription_status sa neskúma.
 */
export function monthlyGrantAmountForAgency(agency: AgencyCreditRow): number {
  if (agency.pricing_model !== null && agency.pricing_model !== undefined) {
    if (agency.pricing_model !== PRICING_V2_AGENCY_MODEL) return 0;
    if (agency.subscription_status !== "active") return 0;
    const band = grantBandOf(agency);
    if (!band) return 0;
    const pack = agency.pack_credits ?? 0;
    if (!Number.isSafeInteger(pack) || pack < 0) return 0;
    return monthlyOfficeGrantCredits(band) + pack;
  }

  return monthlyAgencyGrantCredits({
    seatTier: seatTierFromAccountTier(agency.account_tier),
    seatCount: Math.max(0, agency.seats),
    ownerCockpitActive: agency.owner_cockpit_active,
  });
}

export type GrantMonthlyResult = {
  granted: number;
  skipped: boolean;
  /** Hard failure — caller must mark the cycle failed so cron retries. */
  error?: string;
};

/** Idempotentný mesačný grant (1. deň mesiaca). */
export async function grantMonthlyCreditsForAgency(
  agency: AgencyCreditRow,
  periodKey: string,
): Promise<GrantMonthlyResult> {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { granted: 0, skipped: true, error: "service_unavailable" };
  }

  const amount = monthlyGrantAmountForAgency(agency);

  if (amount <= 0) return { granted: 0, skipped: true };

  const idempotencyKey = monthlyGrantIdempotencyKey(agency.id, periodKey);

  // apply_monthly_grant_credits robí idempotency check, ledger insert aj balance
  // update pod FOR UPDATE. Predchádzajúci tok čítal balance zo snapshotu `agency`
  // a prepisoval ho absolútnou hodnotou — súbežný top-up medzi čítaním a zápisom
  // sa tým stratil (ledger ho mal, purchased_credits_balance nie).
  const result = await applyMonthlyGrantCredits({
    agencyId: agency.id,
    amount,
    periodKey,
    idempotencyKey,
  });

  if (!result.ok) {
    console.warn("[grant-engine] monthly grant:", result.error);
    // Soft `skipped` (amount<=0 / already granted) must NOT look like success to the
    // monthly cycle — without `error`, cron returns HTTP 200 and Vercel never retries.
    return {
      granted: 0,
      skipped: true,
      error: result.error ?? "grant_failed",
    };
  }
  if (result.skipped) return { granted: 0, skipped: true };
  return { granted: result.granted ?? amount, skipped: false };
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
 * Dokončí čiastočne zlyhanú expiráciu: ledger už má expiry key, ale
 * `grant_credits_balance` ešte nie je 0. Číta live balances a CAS-uje update,
 * aby súbežný top-up neprepisoval `credits_balance` starým snapshotom.
 */
async function repairUnclearedGrantExpiry(
  supabase: ServiceRoleClient,
  agencyId: string,
): Promise<ExpireGrantResult> {
  const { data: live, error: readErr } = await supabase
    .from("agencies")
    .select("purchased_credits_balance, grant_credits_balance")
    .eq("id", agencyId)
    .maybeSingle();
  if (readErr) {
    console.warn("[grant-engine] expiry repair read:", readErr.message);
    return { expired: 0, skipped: true, error: readErr.message };
  }
  if (!live || live.grant_credits_balance <= 0) {
    return { expired: 0, skipped: true };
  }

  const purchased = live.purchased_credits_balance ?? 0;
  const grantLeft = live.grant_credits_balance;
  const { data: updated, error: agencyErr } = await supabase
    .from("agencies")
    .update({
      grant_credits_balance: 0,
      credits_balance: purchased,
      billing_updated_at: new Date().toISOString(),
    })
    .eq("id", agencyId)
    .eq("purchased_credits_balance", purchased)
    .eq("grant_credits_balance", grantLeft)
    .select("id");

  if (agencyErr) {
    console.warn("[grant-engine] expiry repair agency:", agencyErr.message);
    return { expired: 0, skipped: true, error: agencyErr.message };
  }
  if (!updated || updated.length === 0) {
    console.warn("[grant-engine] expiry repair CAS miss (concurrent mutation)", {
      agencyId,
    });
    return { expired: 0, skipped: true, error: "concurrent_credit_mutation" };
  }
  return { expired: grantLeft, skipped: false };
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
    //
    // NIKDY nepis `credits_balance` zo snapshotu `agency` načítaného na začiatku
    // cyklu — medzi snapshotom a repairom môže prebehnúť `apply_credit_purchase`
    // a absolútny zápis `credits_balance = snapshot.purchased` by zmazal zaplatené
    // kredity (ledger by ich mal, agencies nie). Live re-read + CAS na purchased
    // aj grant: pri súbehu 0 riadkov → fail-closed, ďalší cron retry.
    if (toExpire > 0 && !currentGrant.exists) {
      const repaired = await repairUnclearedGrantExpiry(supabase, agency.id);
      return repaired;
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

  // Až tu je expirácia bezpečná: ledger ju ešte nemá a grant aktuálneho
  // obdobia ešte nebol pridelený (obe podmienky overené vyššie). Samotný zápis
  // ide cez expire_grant_credits — ten si pod FOR UPDATE prečíta grant pool
  // znova, takže `toExpire` zo snapshotu už nie je to, čo sa odpíše, a súbežný
  // top-up si credits_balance neprepíše.
  const result = await expireGrantCreditsAtomic({
    agencyId: agency.id,
    periodKey,
    idempotencyKey,
  });

  if (!result.ok) {
    console.warn("[grant-engine] expiry:", result.error);
    return { expired: 0, skipped: true, error: result.error };
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
