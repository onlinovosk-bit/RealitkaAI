import Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  COCKPIT_PRODUCTS,
  SEAT_TIER_CONFIG,
  areSeatCheckoutPricesConfigured,
  cockpitLiteEligible,
  getOwnerCockpitStripePriceId,
  getSeatStripePriceId,
  getTopupStripePriceId,
  isFounderKancelariaEligible,
  isOwnerCockpitPurchasable,
  parseSeatTier,
  parseTopupPackageKey,
  type SeatTier,
  type TopupPackageKey,
} from "@/lib/program-tier-pricing";
import {
  currentPeriodKey,
  grantMonthlyCreditsForAgency,
  type AgencyCreditRow,
} from "@/lib/credits/grant-engine";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

async function loadAuthHelpers() {
  return import("@/lib/auth");
}

/**
 * Seat/top-up Stripe metadata must carry a real agency UUID.
 * Empty/null agency_id used to be written as "" → webhook fail-closed (#401)
 * after the customer already paid (permanent stuck fulfillment).
 */
export function requireCheckoutAgencyId(
  profile: { agency_id?: string | null } | null | undefined,
): string {
  const agencyId =
    typeof profile?.agency_id === "string" ? profile.agency_id.trim() : "";
  if (!agencyId) {
    throw new Error(
      "Chýba agency_id profilu — seat/top-up checkout nie je možné dokončiť.",
    );
  }
  return agencyId;
}

export type SeatCheckoutInput = {
  seatTier: SeatTier;
  quantity: number;
  includeOwnerCockpit?: boolean;
};

/** Builds Stripe Checkout line items + metadata (unit-tested without Stripe). */
export function buildSeatCheckoutSessionParams(input: SeatCheckoutInput): {
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  metadata: Record<string, string>;
  quantity: number;
} {
  const tier = SEAT_TIER_CONFIG[input.seatTier];
  const qty = Math.max(tier.minSeats, input.quantity);
  const priceId = getSeatStripePriceId(input.seatTier);
  if (!priceId) throw new Error("Seat Stripe price nie je nakonfigurovaný.");

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: priceId, quantity: qty },
  ];

  const founderEligible = isFounderKancelariaEligible();
  const cockpitRequested = input.includeOwnerCockpit && qty >= COCKPIT_PRODUCTS.owner.minSeats;
  const cockpitPrice = cockpitRequested ? getOwnerCockpitStripePriceId({ founderEligible }) : "";

  // Fail closed. The customer saw a total that includes the cockpit; charging
  // them a different one is not an acceptable degradation. The checkbox is
  // gated on `isOwnerCockpitPurchasable`, so reaching here means the config
  // changed between page load and submit — rare, and worth an error rather
  // than a silent mismatch.
  //
  // Same predicate as that gate, deliberately. A truthiness check here would
  // let a placeholder like `price_xxx` through the guard while the gate hid the
  // checkbox, so the two could disagree with no config change at all — and the
  // placeholder would reach Stripe.
  if (cockpitRequested && !isOwnerCockpitPurchasable({ founderEligible })) {
    throw new Error("Owner Cockpit Stripe price nie je nakonfigurovaný.");
  }
  if (cockpitPrice) {
    lineItems.push({ price: cockpitPrice, quantity: 1 });
  }

  return {
    lineItems,
    quantity: qty,
    metadata: {
      checkoutType: "seat",
      seatTier: input.seatTier,
      seatQuantity: String(qty),
      ownerCockpit: cockpitPrice ? "true" : "false",
      // What was actually charged, not what the caller was eligible for. These
      // diverge when the cockpit was not purchased at all.
      founderCockpit: cockpitPrice && founderEligible ? "true" : "false",
    },
  };
}

/** Seat checkout — recurring, quantity = počet seatov. */
export async function createSeatCheckoutSession(input: SeatCheckoutInput) {
  if (!areSeatCheckoutPricesConfigured()) return null;

  const stripe = getStripe();
  if (!stripe) return null;

  const { getCurrentUser, getCurrentProfile } = await loadAuthHelpers();
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  if (!user?.email) throw new Error("Používateľ nemá email.");
  const agencyId = requireCheckoutAgencyId(profile);

  const { lineItems, metadata, quantity } = buildSeatCheckoutSessionParams(input);
  const appUrl = getAppUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_collection: "if_required",
    line_items: lineItems,
    success_url: `${appUrl}/billing?checkout=success&type=seat`,
    cancel_url: `${appUrl}/upgrade?checkout=cancel`,
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: {
      authUserId: user.id,
      profileId: profile?.id ?? "",
      agencyId,
      ...metadata,
      seatQuantity: String(quantity),
    },
  });

  return { id: session.id, url: session.url };
}

/** Top-up kredity — one-time, platba kartou. */
export async function createTopupCheckoutSession(packageKey: TopupPackageKey) {
  const stripe = getStripe();
  if (!stripe) return null;

  const { getCurrentUser, getCurrentProfile } = await loadAuthHelpers();
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  if (!user?.email) throw new Error("Používateľ nemá email.");
  const agencyId = requireCheckoutAgencyId(profile);

  const priceId = getTopupStripePriceId(packageKey);
  if (!priceId) throw new Error("Top-up Stripe price nie je nakonfigurovaný.");

  const appUrl = getAppUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/billing?checkout=success&type=credits`,
    cancel_url: `${appUrl}/upgrade?checkout=cancel`,
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: {
      authUserId: user.id,
      profileId: profile?.id ?? "",
      agencyId,
      checkoutType: "credit_topup",
      topupPackage: packageKey,
    },
  });

  return { id: session.id, url: session.url };
}

function resolveCockpitTier(seats: number, ownerCockpit: boolean): string | null {
  if (ownerCockpit) return "owner";
  if (cockpitLiteEligible(seats)) return "lite";
  return null;
}

/** Stavy, pri ktorých seat fulfillment nesmie obnoviť platený plán (rovnaké ako lifecycle revoke). */
const REVOKED_SUBSCRIPTION_STATUSES = new Set(["canceled", "unpaid", "incomplete_expired"]);

export type StripeSubscriptionReader = {
  subscriptions: { retrieve(id: string): Promise<{ status: string }> };
};

/**
 * Skutočný stav predplatného zo Stripe. `checkout.session.completed` môže prísť
 * oneskorene, opakovane alebo až po `customer.subscription.deleted`; pravdu nesie
 * Stripe, nie udalosť (rovnaký princíp ako pricing-v2 `loadLiveSubscriptionStatus`).
 */
async function loadLiveSubscriptionStatus(
  subscriptionId: string,
  reader?: StripeSubscriptionReader | null,
): Promise<{ ok: true; status: string } | { ok: false }> {
  const stripe = reader ?? getStripe();
  if (!stripe) {
    console.error(
      "[credits-billing] seat checkout: STRIPE_SECRET_KEY chýba, stav predplatného sa nedá overiť",
    );
    return { ok: false };
  }
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return { ok: true, status: subscription.status };
  } catch (err) {
    console.error("[credits-billing] seat checkout: stav predplatného sa nepodarilo načítať", {
      subscriptionId,
      code: (err as { code?: unknown } | null)?.code ?? null,
    });
    return { ok: false };
  }
}

export type SeatEntitlementApplyResult =
  | { ok: false }
  | { ok: true; applied: false; reason: "subscription_revoked" }
  | { ok: true; applied: true; subscriptionStatus: string };

/** Po úspešnom seat checkout webhook — zapíše tier/seaty/cockpit na agency + profil. */
export async function applySeatCheckoutEntitlements(
  input: {
    agencyId: string;
    authUserId?: string;
    seatTier: SeatTier;
    seatQuantity: number;
    ownerCockpit: boolean;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
  },
  deps: { stripe?: StripeSubscriptionReader } = {},
): Promise<SeatEntitlementApplyResult> {
  const supabase = createServiceRoleClient();
  if (!supabase || !input.agencyId) return { ok: false };

  const subscriptionId =
    typeof input.stripeSubscriptionId === "string" ? input.stripeSubscriptionId.trim() : "";
  if (!subscriptionId) {
    console.warn("[credits-billing] seat checkout without subscription id");
    return { ok: false };
  }

  const live = await loadLiveSubscriptionStatus(subscriptionId, deps.stripe);
  if (!live.ok) return { ok: false };
  if (REVOKED_SUBSCRIPTION_STATUSES.has(live.status)) {
    console.warn("[credits-billing] seat checkout ignored: subscription is no longer live", {
      agencyId: input.agencyId,
      subscriptionId,
      status: live.status,
    });
    // Nič na plnenie — ACK, aby Stripe neopakoval; grant ani tier sa neobnovia.
    return { ok: true, applied: false, reason: "subscription_revoked" };
  }

  const tierConfig = SEAT_TIER_CONFIG[input.seatTier];
  const seats = Math.max(tierConfig.minSeats, input.seatQuantity);
  const accountTier = tierConfig.planKey;
  const cockpitTier = resolveCockpitTier(seats, input.ownerCockpit);

  const agencyUpdate: Record<string, unknown> = {
    seats,
    account_tier: accountTier,
    owner_cockpit_active: input.ownerCockpit,
    cockpit_tier: cockpitTier,
    // Live Stripe status — never hardcode "active" (stale/replayed checkout after cancel).
    subscription_status: live.status,
    billing_source: "stripe",
    billing_updated_at: new Date().toISOString(),
    stripe_subscription_id: subscriptionId,
  };

  if (input.stripeCustomerId) {
    agencyUpdate.stripe_customer_id = input.stripeCustomerId;
  }

  // .select("id"): UPDATE na neexistujúci riadok nevráti chybu, len 0 riadkov —
  // to nesmie prejsť ako úspech (inak Stripe dostane ACK a platba ostane bez aktivácie).
  const { data: updated, error: agencyErr } = await supabase
    .from("agencies")
    .update(agencyUpdate)
    .eq("id", input.agencyId)
    .select("id");

  if (agencyErr || !updated || updated.length === 0) {
    console.warn(
      "[credits-billing] agency entitlement:",
      agencyErr?.message ?? "no_row",
    );
    return { ok: false };
  }

  if (input.authUserId) {
    const uiRole = accountTier === "enterprise" ? "owner_vision" : "agent";
    await supabase
      .from("profiles")
      .update({
        account_tier: accountTier,
        ui_role: uiRole,
        protocol_active: false,
      })
      .eq("auth_user_id", input.authUserId);
  }

  return { ok: true, applied: true, subscriptionStatus: live.status };
}

/** Idempotentný prvý mesačný grant po seat checkout (reuse grant-engine). */
export async function triggerInitialGrantAfterSeatCheckout(
  agencyId: string,
): Promise<{ granted: number; skipped: boolean; error?: string }> {
  const supabase = createServiceRoleClient();
  if (!supabase) return { granted: 0, skipped: true, error: "service_unavailable" };

  const { data: agency, error } = await supabase
    .from("agencies")
    .select(
      "id, seats, account_tier, grant_credits_balance, purchased_credits_balance, owner_cockpit_active, credits_balance",
    )
    .eq("id", agencyId)
    .single();

  if (error || !agency) {
    return { granted: 0, skipped: true, error: error?.message ?? "agency_not_found" };
  }

  return grantMonthlyCreditsForAgency(agency as AgencyCreditRow, currentPeriodKey());
}

/** Po úspešnom top-up webhook — pripíše kúpené kredity (atomický RPC). */
export async function applyTopupPurchase(input: {
  agencyId: string;
  packageKey: TopupPackageKey;
  stripeSessionId: string;
}): Promise<boolean> {
  const { TOPUP_PACKAGES } = await import("@/lib/program-tier-pricing");
  const { applyCreditPurchase } = await import("@/lib/credits/mutate-credits");
  const pkg = TOPUP_PACKAGES[input.packageKey];
  const idempotencyKey = `purchase:${input.agencyId}:${input.stripeSessionId}`;

  // apply_credit_purchase drží riadok agentúry pod FOR UPDATE a zapisuje ledger
  // aj balance v jednej transakcii. Predtým to bol read-modify-write bez zámku:
  // súbežný top-up a mesačný grant si vedeli prepísať balance, hoci ledger mal
  // oba riadky. Preto tu už nie je ani kompenzačné mazanie ledger riadku —
  // nemôže vzniknúť stav, kde ledger prešiel a balance nie.
  const result = await applyCreditPurchase({
    agencyId: input.agencyId,
    amount: pkg.credits,
    reason: "credit_topup",
    idempotencyKey,
    ref: input.packageKey,
  });

  if (!result.ok) {
    console.warn("[credits-billing] topup:", result.error);
    return false;
  }

  return true;
}

export function parseCheckoutBody(body: Record<string, unknown>): {
  type: "seat" | "topup" | "legacy";
  seatTier?: SeatTier;
  quantity?: number;
  includeOwnerCockpit?: boolean;
  topupPackage?: TopupPackageKey;
  planKey?: string;
} {
  const checkoutType = String(body.checkoutType ?? body.type ?? "legacy");
  if (checkoutType === "seat") {
    return {
      type: "seat",
      seatTier: parseSeatTier(String(body.seatTier ?? body.plan ?? "")),
      quantity: Number(body.quantity ?? body.seats ?? 1),
      includeOwnerCockpit: Boolean(body.includeOwnerCockpit ?? body.cockpit),
    };
  }
  if (checkoutType === "topup" || checkoutType === "credits") {
    const key = parseTopupPackageKey(String(body.topupPackage ?? body.package ?? ""));
    return { type: "topup", topupPackage: key ?? "rast" };
  }
  return { type: "legacy", planKey: String(body.planKey ?? "") };
}
