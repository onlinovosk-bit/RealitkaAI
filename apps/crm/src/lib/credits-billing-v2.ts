import Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireCheckoutAgencyId } from "@/lib/credits-billing";
import {
  PRICING_V2_BANDS,
  PRICING_V2_BAND_IDS,
  PRICING_V2_MONTHLY_PACKS,
  resolvePricingV2Band,
  type PricingV2BandId,
} from "@/lib/pricing-v2";
import {
  PRICING_V2_AGENCY_MODEL,
  PRICING_V2_BAND_ACCOUNT_TIER,
  PRICING_V2_BAND_PRICE_ENV,
  PRICING_V2_CHECKOUT_TYPE_CREDITS,
  PRICING_V2_CHECKOUT_TYPE_PLAN,
  PRICING_V2_CREDIT_PRICE_ENV,
  PRICING_V2_PACK_PRICE_ENV,
  buildPricingV2PlanMetadata,
  readPricingV2CreditsMetadata,
  readPricingV2PlanMetadata,
  type PricingV2CheckoutRequest,
} from "@/lib/pricing-v2-contract";
import { isValidStripePriceId } from "@/lib/program-tier-pricing";
import {
  currentPeriodKey,
  monthlyGrantAmountForAgency,
  type AgencyCreditRow,
} from "@/lib/credits/grant-engine";
import { monthlyGrantIdempotencyKey } from "@/lib/credits/grant-idempotency";
import { applyCreditPurchase, applyMonthlyGrantCredits } from "@/lib/credits/mutate-credits";

type Env = Record<string, string | undefined>;

/** Stripe Checkout povoľuje `quantity` najviac 999 999. */
export const PRICING_V2_MAX_CREDITS_PER_PURCHASE = 999_999;

/** Stavy, pri ktorých kancelária ešte má (alebo mala a nevyriešila) platené predplatné. */
const LIVE_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due", "unpaid", "incomplete"];

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

// ---------------------------------------------------------------------------
// Price ID → v2 rola (čisté, bez Stripe a DB)
// ---------------------------------------------------------------------------

export type PricingV2PriceRole =
  | { kind: "band"; bandId: PricingV2BandId }
  | { kind: "pack"; credits: number }
  | { kind: "credit" };

/**
 * Ktorú v2 cenu predstavuje Stripe price ID. Nenastavená alebo neplatná env premenná nikdy
 * nezhodí („undefined === undefined“ je presne chyba, ktorá už raz zhodila legacy tier).
 */
export function resolvePricingV2PriceRole(
  priceId: string | null | undefined,
  env: Env = process.env,
): PricingV2PriceRole | null {
  const id = (priceId ?? "").trim();
  if (!id) return null;
  const is = (envName: string) => {
    const configured = env[envName];
    return isValidStripePriceId(configured) && configured!.trim() === id;
  };
  for (const bandId of PRICING_V2_BAND_IDS) {
    if (is(PRICING_V2_BAND_PRICE_ENV[bandId])) return { kind: "band", bandId };
  }
  for (const pack of PRICING_V2_MONTHLY_PACKS) {
    if (is(PRICING_V2_PACK_PRICE_ENV[pack.credits])) return { kind: "pack", credits: pack.credits };
  }
  if (is(PRICING_V2_CREDIT_PRICE_ENV)) return { kind: "credit" };
  return null;
}

/** True, ak aspoň jedna položka predplatného je v2 cena (poradie položiek Stripe negarantuje). */
export function subscriptionHasPricingV2Price(
  subscription: { items?: { data?: Array<{ price?: { id?: string | null } | null }> } } | null | undefined,
  env: Env = process.env,
): boolean {
  const items = subscription?.items?.data ?? [];
  return items.some((item) => resolvePricingV2PriceRole(item?.price?.id, env) !== null);
}

// ---------------------------------------------------------------------------
// Checkout: čisté buildery (testovateľné bez Stripe)
// ---------------------------------------------------------------------------

/** Názvy env premenných cien, ktoré konkrétna požiadavka potrebuje a ktoré chýbajú. */
export function missingPricingV2PriceEnvKeysForRequest(
  request: PricingV2CheckoutRequest,
  env: Env = process.env,
): string[] {
  const needed: string[] = [];
  if (request.checkoutType === PRICING_V2_CHECKOUT_TYPE_PLAN) {
    const band = resolvePricingV2Band(request.users);
    if (band.ok) needed.push(PRICING_V2_BAND_PRICE_ENV[band.band.id]);
    else needed.push(...PRICING_V2_BAND_IDS.map((id) => PRICING_V2_BAND_PRICE_ENV[id]));
    if (request.packCredits) needed.push(PRICING_V2_PACK_PRICE_ENV[request.packCredits] ?? `pack:${request.packCredits}`);
  } else {
    needed.push(PRICING_V2_CREDIT_PRICE_ENV);
  }
  return needed.filter((name) => !isValidStripePriceId(env[name]));
}

export type PricingV2CheckoutActor = {
  agencyId: string;
  authUserId: string;
  profileId: string;
};

export type PricingV2PlanCheckoutParams = {
  mode: "subscription";
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  metadata: Record<string, string>;
  automaticTax: boolean;
};

/** DPH: `automatic_tax` sa zapne len pri PRICING_V2_STRIPE_TAX=on (tax_behavior je vlastnosť ceny v Stripe). */
export function isPricingV2StripeTaxOn(env: Env = process.env): boolean {
  return (env.PRICING_V2_STRIPE_TAX ?? "").trim().toLowerCase() === "on";
}

/** Riadok pásma (qty 1) + voliteľný riadok balíka (qty 1) + metadáta. Chýbajúca cena = výnimka (fail-closed). */
export function buildPricingV2PlanCheckoutParams(
  input: PricingV2CheckoutActor & { users: number; packCredits: number | null },
  env: Env = process.env,
): PricingV2PlanCheckoutParams {
  // Hádže RangeError pri neplatnom počte používateľov alebo prázdnom agencyId.
  const metadata = buildPricingV2PlanMetadata(input);
  const bandPriceId = env[PRICING_V2_BAND_PRICE_ENV[metadata.bandId]]?.trim();
  if (!isValidStripePriceId(bandPriceId)) throw new Error("Stripe cena pásma v2 nie je nakonfigurovaná.");

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [{ price: bandPriceId, quantity: 1 }];
  if (input.packCredits) {
    const packPriceId = env[PRICING_V2_PACK_PRICE_ENV[input.packCredits] ?? ""]?.trim();
    if (!isValidStripePriceId(packPriceId)) throw new Error("Stripe cena balíka v2 nie je nakonfigurovaná.");
    lineItems.push({ price: packPriceId, quantity: 1 });
  }

  return { mode: "subscription", lineItems, metadata: { ...metadata }, automaticTax: isPricingV2StripeTaxOn(env) };
}

export type PricingV2CreditsCheckoutParams = {
  mode: "payment";
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  metadata: Record<string, string>;
  automaticTax: boolean;
};

/** Jednorazové kredity: cena STRIPE_PRICE_V2_CREDIT, množstvo = počet kreditov. */
export function buildPricingV2CreditsCheckoutParams(
  input: PricingV2CheckoutActor & { credits: number },
  env: Env = process.env,
): PricingV2CreditsCheckoutParams {
  if (
    !Number.isSafeInteger(input.credits) ||
    input.credits < 1 ||
    input.credits > PRICING_V2_MAX_CREDITS_PER_PURCHASE
  ) {
    throw new RangeError(`Neplatný počet kreditov: ${input.credits}`);
  }
  if (!input.agencyId.trim()) throw new RangeError("Chýba agencyId.");
  const priceId = env[PRICING_V2_CREDIT_PRICE_ENV]?.trim();
  if (!isValidStripePriceId(priceId)) throw new Error("Stripe cena kreditu v2 nie je nakonfigurovaná.");

  return {
    mode: "payment",
    lineItems: [{ price: priceId, quantity: input.credits }],
    metadata: {
      checkoutType: PRICING_V2_CHECKOUT_TYPE_CREDITS,
      agencyId: input.agencyId,
      authUserId: input.authUserId,
      profileId: input.profileId,
      credits: String(input.credits),
    },
    automaticTax: isPricingV2StripeTaxOn(env),
  };
}

// ---------------------------------------------------------------------------
// Kancelária s existujúcim predplatným
// ---------------------------------------------------------------------------

export type AgencyBillingState = {
  pricing_model?: string | null;
  subscription_status?: string | null;
  stripe_subscription_id?: string | null;
  /** Ručne dohodnutý plán (napr. referenčný klient mimo Stripe): je to legacy dohoda, nepresúva sa. */
  manual_plan?: string | null;
};

function hasLiveSubscription(row: AgencyBillingState): boolean {
  const status = (row.subscription_status ?? "").toLowerCase();
  if (LIVE_SUBSCRIPTION_STATUSES.includes(status)) return true;
  return Boolean(row.stripe_subscription_id) && status !== "canceled";
}

/**
 * Kancelária s existujúcim legacy predplatným sa NIKDY automaticky nepresúva (ani keď je v2 zapnuté).
 * Fail-closed: čokoľvek iné než jasné „nie je v2 a nemá živé predplatné“ je legacy.
 */
export function hasLegacySubscription(row: AgencyBillingState | null | undefined): boolean {
  if (!row) return true;
  if (row.pricing_model === PRICING_V2_AGENCY_MODEL) return false;
  if (row.pricing_model !== null && row.pricing_model !== undefined) return true;
  if ((row.manual_plan ?? "").trim()) return true;
  return hasLiveSubscription(row);
}

/** v2 kancelária s živým v2 predplatným: ďalší plánový checkout by založil druhé predplatné. */
export function hasLivePricingV2Subscription(row: AgencyBillingState | null | undefined): boolean {
  return row?.pricing_model === PRICING_V2_AGENCY_MODEL && hasLiveSubscription(row);
}

export type PricingV2CheckoutOutcome =
  | { kind: "ok"; result: { id: string; url: string | null } }
  | { kind: "legacy_subscription" }
  | { kind: "subscription_exists" }
  | { kind: "unavailable" };

async function loadAuthHelpers() {
  return import("@/lib/auth");
}

/**
 * Stripe Checkout pre v2 (plán + voliteľný balík, alebo jednorazové kredity).
 * Volajúci (trasa) už overil prepínač, tvar požiadavky a konfiguráciu cien.
 */
export async function createPricingV2CheckoutSession(
  request: PricingV2CheckoutRequest,
): Promise<PricingV2CheckoutOutcome> {
  const stripe = getStripe();
  const supabase = createServiceRoleClient();
  if (!stripe || !supabase) return { kind: "unavailable" };

  const { getCurrentUser, getCurrentProfile } = await loadAuthHelpers();
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  if (!user?.email) throw new Error("Používateľ nemá email.");
  const agencyId = requireCheckoutAgencyId(profile);

  // Stav kancelárie sa musí dať prečítať: pri chybe NErobíme checkout (fail-closed, nie „asi legacy nie je“).
  const { data: agency, error } = await supabase
    .from("agencies")
    .select("id, pricing_model, subscription_status, stripe_subscription_id, manual_plan")
    .eq("id", agencyId)
    .maybeSingle();
  if (error) throw new Error("Stav predplatného kancelárie sa nepodarilo overiť.");
  if (hasLegacySubscription(agency as AgencyBillingState | null)) return { kind: "legacy_subscription" };
  if (
    request.checkoutType === PRICING_V2_CHECKOUT_TYPE_PLAN &&
    hasLivePricingV2Subscription(agency as AgencyBillingState)
  ) {
    return { kind: "subscription_exists" };
  }

  const actor: PricingV2CheckoutActor = {
    agencyId,
    authUserId: user.id,
    profileId: profile?.id ?? "",
  };
  const appUrl = getAppUrl();

  if (request.checkoutType === PRICING_V2_CHECKOUT_TYPE_PLAN) {
    const params = buildPricingV2PlanCheckoutParams({ ...actor, users: request.users, packCredits: request.packCredits });
    const session = await stripe.checkout.sessions.create({
      mode: params.mode,
      line_items: params.lineItems,
      success_url: `${appUrl}/billing?checkout=success&type=pricing_v2`,
      cancel_url: `${appUrl}/upgrade?checkout=cancel`,
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: params.metadata,
      // Metadáta aj na predplatnom: pri riešení incidentov je agencyId vidieť aj bez session.
      subscription_data: {
        metadata: { checkoutType: PRICING_V2_CHECKOUT_TYPE_PLAN, agencyId },
      },
      ...(params.automaticTax ? { automatic_tax: { enabled: true } } : {}),
    });
    return { kind: "ok", result: { id: session.id, url: session.url } };
  }

  const params = buildPricingV2CreditsCheckoutParams({ ...actor, credits: request.credits });
  const session = await stripe.checkout.sessions.create({
    mode: params.mode,
    line_items: params.lineItems,
    success_url: `${appUrl}/billing?checkout=success&type=credits`,
    cancel_url: `${appUrl}/upgrade?checkout=cancel`,
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: params.metadata,
    ...(params.automaticTax ? { automatic_tax: { enabled: true } } : {}),
  });
  return { kind: "ok", result: { id: session.id, url: session.url } };
}

// ---------------------------------------------------------------------------
// Fulfillment (webhook). Každá funkcia vráti true LEN keď je stav naozaj zapísaný / už zapísaný.
// ---------------------------------------------------------------------------

function sessionCustomerId(session: Stripe.Checkout.Session): string | null {
  const c = session.customer;
  if (!c) return null;
  return typeof c === "string" ? c : c.id;
}

function sessionSubscriptionId(session: Stripe.Checkout.Session): string | null {
  const s = session.subscription;
  if (!s) return null;
  return typeof s === "string" ? s : s.id;
}

/** `unpaid` = čaká sa na asynchrónnu platbu; plnenie príde s checkout.session.async_payment_succeeded. */
function isSessionPaid(session: Stripe.Checkout.Session): boolean {
  return session.payment_status === "paid" || session.payment_status === "no_payment_required";
}

/** Prvý mesačný grant v2: rovnaký idempotentný kľúč ako cron (agency + YYYYMM), takže ho nikdy nedostane dvakrát. */
async function applyFirstPricingV2Grant(row: AgencyCreditRow): Promise<boolean> {
  const amount = monthlyGrantAmountForAgency(row);
  if (amount <= 0) {
    console.warn("[pricing-v2] first grant amount is 0", { agencyId: row.id });
    return false;
  }
  const periodKey = currentPeriodKey();
  const result = await applyMonthlyGrantCredits({
    agencyId: row.id,
    amount,
    periodKey,
    idempotencyKey: monthlyGrantIdempotencyKey(row.id, periodKey),
  });
  if (!result.ok) {
    // Chybu NEzamlčíme: 500 → Stripe zopakuje, entitlement aj grant sú idempotentné.
    console.warn("[pricing-v2] first grant failed:", result.error);
    return false;
  }
  return true;
}

/** checkout.session (pricing_v2): nastaví pásmo/používateľov/balík a prvý grant práve raz. */
export async function fulfillPricingV2PlanCheckout(session: Stripe.Checkout.Session): Promise<boolean> {
  const meta = readPricingV2PlanMetadata(session.metadata);
  if (!meta) {
    console.warn("[pricing-v2] plan checkout: invalid metadata", { sessionId: session.id });
    return false;
  }
  if (!isSessionPaid(session)) {
    console.info("[pricing-v2] plan checkout awaiting payment", { sessionId: session.id });
    return true;
  }
  const subscriptionId = sessionSubscriptionId(session);
  if (!subscriptionId) {
    console.warn("[pricing-v2] plan checkout without subscription id", { sessionId: session.id });
    return false;
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return false;

  const { data: existing, error: readErr } = await supabase
    .from("agencies")
    .select("id, pricing_model, subscription_status, stripe_subscription_id, manual_plan")
    .eq("id", meta.agencyId)
    .maybeSingle();
  if (readErr || !existing) {
    console.warn("[pricing-v2] plan checkout: agency not readable", { agencyId: meta.agencyId });
    return false;
  }
  // Legacy predplatiteľ sa nikdy automaticky nepresúva (ani cez webhook s platnými metadátami).
  if (hasLegacySubscription(existing as AgencyBillingState)) {
    console.error("[pricing-v2] plan checkout refused: agency has legacy subscription", {
      agencyId: meta.agencyId,
      sessionId: session.id,
    });
    return false;
  }

  const customerId = sessionCustomerId(session);
  const update: Record<string, unknown> = {
    seats: meta.users,
    account_tier: PRICING_V2_BAND_ACCOUNT_TIER[meta.bandId],
    pricing_model: PRICING_V2_AGENCY_MODEL,
    pricing_band: meta.bandId,
    licensed_users: meta.users,
    pack_credits: meta.packCredits,
    subscription_status: "active",
    billing_source: "stripe",
    billing_updated_at: new Date().toISOString(),
    stripe_subscription_id: subscriptionId,
  };
  if (customerId) update.stripe_customer_id = customerId;

  // .select("id"): UPDATE na neexistujúci riadok nevráti chybu, len 0 riadkov — to nesmie prejsť ako úspech.
  const { data: updated, error: updateErr } = await supabase
    .from("agencies")
    .update(update)
    .eq("id", meta.agencyId)
    .select("id");
  if (updateErr || !updated || updated.length === 0) {
    console.warn("[pricing-v2] plan checkout: agency update failed", updateErr?.message ?? "no_row");
    return false;
  }

  if (meta.authUserId) {
    const accountTier = PRICING_V2_BAND_ACCOUNT_TIER[meta.bandId];
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        account_tier: accountTier,
        ui_role: accountTier === "enterprise" ? "owner_vision" : "agent",
        protocol_active: false,
      })
      .eq("auth_user_id", meta.authUserId);
    if (profileErr) console.warn("[pricing-v2] profile tier update:", profileErr.message);
  }

  return applyFirstPricingV2Grant({
    id: meta.agencyId,
    seats: meta.users,
    account_tier: PRICING_V2_BAND_ACCOUNT_TIER[meta.bandId],
    grant_credits_balance: 0,
    purchased_credits_balance: 0,
    owner_cockpit_active: false,
    credits_balance: 0,
    pricing_model: PRICING_V2_AGENCY_MODEL,
    pricing_band: meta.bandId,
    pack_credits: meta.packCredits,
    subscription_status: "active",
  });
}

/** checkout.session (pricing_v2_credits): pripíše kúpené kredity (purchased pool) cez atomický RPC. */
export async function fulfillPricingV2CreditsCheckout(session: Stripe.Checkout.Session): Promise<boolean> {
  const meta = readPricingV2CreditsMetadata(session.metadata);
  if (!meta) {
    console.warn("[pricing-v2] credits checkout: invalid metadata", { sessionId: session.id });
    return false;
  }
  if (!isSessionPaid(session)) {
    console.info("[pricing-v2] credits checkout awaiting payment", { sessionId: session.id });
    return true;
  }
  const result = await applyCreditPurchase({
    agencyId: meta.agencyId,
    amount: meta.credits,
    reason: "credit_topup_v2",
    idempotencyKey: `purchase:${meta.agencyId}:${session.id}`,
    ref: "pricing_v2_credits",
  });
  if (!result.ok) {
    console.warn("[pricing-v2] credits purchase:", result.error);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// customer.subscription.created/updated/deleted pre v2 ceny (bez syncAccountTier)
// ---------------------------------------------------------------------------

type SubscriptionLike = {
  id?: string;
  status?: string;
  items?: { data?: Array<{ price?: { id?: string | null } | null }> };
};

/** Pásmo a balík z položiek predplatného. `band: null` = žiadne alebo nejednoznačné pásmo. */
export function readPricingV2SubscriptionItems(
  subscription: SubscriptionLike,
  env: Env = process.env,
): { band: PricingV2BandId | null; packCredits: number } {
  const bands = new Set<PricingV2BandId>();
  let packCredits = 0;
  for (const item of subscription.items?.data ?? []) {
    const role = resolvePricingV2PriceRole(item?.price?.id, env);
    if (role?.kind === "band") bands.add(role.bandId);
    if (role?.kind === "pack") packCredits = role.credits;
  }
  return { band: bands.size === 1 ? [...bands][0] : null, packCredits };
}

/** Ponechá počet používateľov, ak patrí do pásma; inak ho zovrie do pásma (Stripe počet používateľov nenesie). */
export function clampLicensedUsers(current: number | null | undefined, bandId: PricingV2BandId): number {
  const band = PRICING_V2_BANDS.find((b) => b.id === bandId)!;
  const base = Number.isSafeInteger(current) && (current as number) >= 1 ? (current as number) : band.minUsers;
  const lower = Math.max(base, band.minUsers);
  return band.maxUsers === null ? lower : Math.min(lower, band.maxUsers);
}

/**
 * Spracuje subscription udalosť s v2 cenou. Vráti false LEN pri zlyhanom zápise do DB (Stripe zopakuje).
 * Neznáma kancelária = ack (true): `created`/`updated` často predbehnú checkout.session.completed,
 * ktorý je vlastníkom prvotného zápisu.
 */
export async function applyPricingV2SubscriptionEvent(event: Stripe.Event): Promise<boolean> {
  const subscription = event.data.object as unknown as SubscriptionLike;
  if (!subscription?.id) return false;
  const supabase = createServiceRoleClient();
  if (!supabase) return false;

  const { data: agency, error: readErr } = await supabase
    .from("agencies")
    .select("id, pricing_model, licensed_users")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  if (readErr) {
    console.warn("[pricing-v2] subscription event: agency lookup failed:", readErr.message);
    return false;
  }
  if (!agency || agency.pricing_model !== PRICING_V2_AGENCY_MODEL) {
    console.info("[pricing-v2] subscription event for unknown/non-v2 agency; fulfillment owns first write", {
      type: event.type,
      subscriptionId: subscription.id,
    });
    return true;
  }
  if (event.type === "customer.subscription.created") return true;

  const now = new Date().toISOString();

  if (event.type === "customer.subscription.deleted") {
    // Zrušenie: stav canceled (cron ani fulfillment už negrantuje) a návrat na free, ako legacy forceFree.
    const { error } = await supabase
      .from("agencies")
      .update({ subscription_status: "canceled", account_tier: "free", pack_credits: 0, billing_updated_at: now })
      .eq("id", agency.id);
    if (error) {
      console.warn("[pricing-v2] cancel update failed:", error.message);
      return false;
    }
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ account_tier: "free", ui_role: "agent", protocol_active: false })
      .eq("agency_id", agency.id);
    if (profileErr) console.warn("[pricing-v2] cancel profile downgrade:", profileErr.message);
    return true;
  }

  if (event.type !== "customer.subscription.updated") return true;

  // updated: stav predplatného sa prenáša vždy (past_due/unpaid/canceled = žiadne ďalšie granty).
  const status = typeof subscription.status === "string" && subscription.status ? subscription.status : null;
  if (!status) {
    console.warn("[pricing-v2] subscription.updated without status", { subscriptionId: subscription.id });
    return false;
  }
  const update: Record<string, unknown> = { subscription_status: status, billing_updated_at: now };
  const { band, packCredits } = readPricingV2SubscriptionItems(subscription);
  if (band) {
    const users = clampLicensedUsers(agency.licensed_users as number | null, band);
    update.pricing_band = band;
    update.account_tier = PRICING_V2_BAND_ACCOUNT_TIER[band];
    update.licensed_users = users;
    update.seats = users;
    update.pack_credits = packCredits;
  } else {
    console.warn("[pricing-v2] subscription.updated without a single v2 band item; only status synced", {
      subscriptionId: subscription.id,
    });
  }
  const { error } = await supabase.from("agencies").update(update).eq("id", agency.id);
  if (error) {
    console.warn("[pricing-v2] subscription update failed:", error.message);
    return false;
  }
  return true;
}
