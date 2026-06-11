import Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  COCKPIT_PRODUCTS,
  SEAT_TIER_CONFIG,
  getOwnerCockpitStripePriceId,
  getSeatStripePriceId,
  getTopupStripePriceId,
  parseSeatTier,
  parseTopupPackageKey,
  type SeatTier,
  type TopupPackageKey,
} from "@/lib/program-tier-pricing";

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

/** Seat checkout — recurring, quantity = počet seatov. */
export async function createSeatCheckoutSession(input: {
  seatTier: SeatTier;
  quantity: number;
  includeOwnerCockpit?: boolean;
}) {
  const stripe = getStripe();
  if (!stripe) return null;

  const { getCurrentUser, getCurrentProfile } = await loadAuthHelpers();
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  if (!user?.email) throw new Error("Používateľ nemá email.");

  const tier = SEAT_TIER_CONFIG[input.seatTier];
  const qty = Math.max(tier.minSeats, input.quantity);
  const priceId = getSeatStripePriceId(input.seatTier);
  if (!priceId) throw new Error("Seat Stripe price nie je nakonfigurovaný.");

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: priceId, quantity: qty },
  ];

  if (input.includeOwnerCockpit && qty >= COCKPIT_PRODUCTS.owner.minSeats) {
    const cockpitPrice = getOwnerCockpitStripePriceId();
    if (cockpitPrice) {
      lineItems.push({ price: cockpitPrice, quantity: 1 });
    }
  }

  const appUrl = getAppUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_collection: "if_required",
    line_items: lineItems,
    success_url: `${appUrl}/billing?checkout=success&type=seat`,
    cancel_url: `${appUrl}/billing?checkout=cancel`,
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: {
      authUserId: user.id,
      profileId: profile?.id ?? "",
      agencyId: String((profile as { agency_id?: string })?.agency_id ?? ""),
      checkoutType: "seat",
      seatTier: input.seatTier,
      seatQuantity: String(qty),
      ownerCockpit: input.includeOwnerCockpit ? "true" : "false",
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

  const priceId = getTopupStripePriceId(packageKey);
  if (!priceId) throw new Error("Top-up Stripe price nie je nakonfigurovaný.");

  const appUrl = getAppUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/billing?checkout=success&type=credits`,
    cancel_url: `${appUrl}/billing?checkout=cancel`,
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: {
      authUserId: user.id,
      profileId: profile?.id ?? "",
      agencyId: String((profile as { agency_id?: string })?.agency_id ?? ""),
      checkoutType: "credit_topup",
      topupPackage: packageKey,
    },
  });

  return { id: session.id, url: session.url };
}

/** Po úspešnom top-up webhook — pripíše kúpené kredity. */
export async function applyTopupPurchase(input: {
  agencyId: string;
  packageKey: TopupPackageKey;
  stripeSessionId: string;
}): Promise<boolean> {
  const supabase = createServiceRoleClient();
  if (!supabase) return false;

  const { TOPUP_PACKAGES } = await import("@/lib/program-tier-pricing");
  const pkg = TOPUP_PACKAGES[input.packageKey];
  const idempotencyKey = `purchase:${input.agencyId}:${input.stripeSessionId}`;

  const { data: existing } = await supabase
    .from("credit_ledger")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing) return true;

  const { data: agency } = await supabase
    .from("agencies")
    .select("purchased_credits_balance, grant_credits_balance, credits_balance")
    .eq("id", input.agencyId)
    .single();

  if (!agency) return false;

  const purchased = (agency.purchased_credits_balance ?? 0) + pkg.credits;
  const grant = agency.grant_credits_balance ?? 0;

  const { error: ledgerErr } = await supabase.from("credit_ledger").insert({
    agency_id: input.agencyId,
    delta: pkg.credits,
    reason: "credit_topup",
    ref: input.packageKey,
    idempotency_key: idempotencyKey,
    source: "purchase",
  });

  if (ledgerErr) {
    console.warn("[credits-billing] topup ledger:", ledgerErr.message);
    return false;
  }

  await supabase
    .from("agencies")
    .update({
      purchased_credits_balance: purchased,
      credits_balance: grant + purchased,
      billing_updated_at: new Date().toISOString(),
    })
    .eq("id", input.agencyId);

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
