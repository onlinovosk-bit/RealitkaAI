/**
 * Cenník v3 (GO 2026-10-19) — rozhranie pre vlnu W2 (vetvy A–D), upravené v PR1 „Cenník v3“.
 *
 * Licencia = jedna Price na interval (mesačná, ročná) s `billing_scheme=tiered`, quantity = počet maklérov.
 * Akcia 9/12 = Stripe kupón `STRIPE_COUPON_V3_ANNUAL_PROMO` len pri `interval=year` a pred termínom.
 * Čisté funkcie bez Stripe a bez DB. Ceny a pásma sú v `pricing-v2.ts` (W1).
 * Špecifikácia: docs/pricing/2026-10-05-pricing-v2-w2-contract.md
 */
import { isValidStripePriceId } from "@/lib/program-tier-pricing";
import {
  PRICING_V2_CREDIT_NET_CENTS,
  isAnnualPromoActive,
  isPricingV2Interval,
  isPricingV2PlansOnly,
  PRICING_V2_MONTHLY_PACKS,
  resolvePricingV2BandResult,
  type PricingV2BandId,
  type PricingV2Catalog,
  type PricingV2Interval,
} from "@/lib/pricing-v2";

export const PRICING_V2_CHECKOUT_TYPE_PLAN = "pricing_v2" as const;
export const PRICING_V2_CHECKOUT_TYPE_CREDITS = "pricing_v2_credits" as const;

/** Stripe Price ID kľúče (NÁZVY env premenných; hodnoty nikdy nelogovať ani nevracať). */

/** Licencia, mesačná (`recurring.interval=month`, tiered graduated, základ × 1,2). */
export const PRICING_V3_SEAT_MONTHLY_PRICE_ENV = "STRIPE_PRICE_V3_SEAT_MONTHLY";
/** Licencia, ročná (`recurring.interval=year`, tiered graduated, 12 × základ). */
export const PRICING_V3_SEAT_YEARLY_PRICE_ENV = "STRIPE_PRICE_V3_SEAT_YEARLY";
/** ID Stripe kupónu akcie 9/12 (`percent_off=25`, `duration=once`, `redeem_by` 2026-12-31T22:59:59Z). */
export const PRICING_V3_ANNUAL_PROMO_COUPON_ENV = "STRIPE_COUPON_V3_ANNUAL_PROMO";

export const PRICING_V3_SEAT_PRICE_ENV: Record<PricingV2Interval, string> = {
  month: PRICING_V3_SEAT_MONTHLY_PRICE_ENV,
  year: PRICING_V3_SEAT_YEARLY_PRICE_ENV,
};

export const PRICING_V2_PACK_PRICE_ENV: Record<number, string> = {
  50: "STRIPE_PRICE_V3_PACK_50",
  100: "STRIPE_PRICE_V3_PACK_100",
  150: "STRIPE_PRICE_V3_PACK_150",
  200: "STRIPE_PRICE_V3_PACK_200",
  250: "STRIPE_PRICE_V3_PACK_250",
  300: "STRIPE_PRICE_V3_PACK_300",
};

/** Jednorazové dokúpenie kreditov: jeden Stripe price s jednotkovou cenou 0,75 € bez DPH, množstvo = počet kreditov. */
export const PRICING_V2_CREDIT_PRICE_ENV = "STRIPE_PRICE_V3_CREDIT";

/** Verejné zobrazenie cien (marketing). Predvolene VYPNUTÉ; zapína len výslovné `true` / `1` / `on`. */
export function isPricingPublicEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const raw = env.PRICING_PUBLIC_ENABLED;
  if (raw === undefined || raw === "") return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "on";
}

/**
 * ID kupónu akcie 9/12, ak sa smie pridať do Checkout Session: len `interval=year`, len do termínu
 * a len ak je env nastavené (placeholder/prázdne = bez kupónu). Inak null (kupón sa nepridá).
 */
export function resolveAnnualPromoCouponId(
  interval: PricingV2Interval,
  now: Date = new Date(),
  env: Record<string, string | undefined> = process.env,
): string | null {
  if (interval !== "year" || !isAnnualPromoActive(now)) return null;
  const id = env[PRICING_V3_ANNUAL_PROMO_COUPON_ENV]?.trim();
  if (!id || /x{3,}/i.test(id)) return null;
  return id;
}

/** Chybové kódy checkout API (pole `code` v odpovedi; text pre človeka je samostatný). */
export const PRICING_V2_ERROR_CODES = {
  disabled: "pricing_v2_disabled",
  legacySubscription: "legacy_subscription",
  invalidRequest: "invalid_request",
  pricesNotConfigured: "prices_not_configured",
  /** Neočakávaná výnimka pri tvorbe v2 checkoutu (napr. profil bez agentúry): 503, nie chyba vstupu. */
  checkoutFailed: "checkout_failed",
  /** Režim „len plány“: balík kreditov a jednorazový kredit sa nepredávajú (403). */
  creditsNotSold: "credits_not_sold",
} as const;

export type PricingV2CheckoutRequest =
  | {
      checkoutType: typeof PRICING_V2_CHECKOUT_TYPE_PLAN;
      users: number;
      packCredits: number | null;
      /** `year` = ročná platba (bez balíka kreditov); chýbajúce = `month` (parser vždy doplní) */
      interval?: PricingV2Interval;
    }
  | { checkoutType: typeof PRICING_V2_CHECKOUT_TYPE_CREDITS; credits: number };

export type PricingV2CheckoutParseResult =
  | { ok: true; value: PricingV2CheckoutRequest }
  | { ok: false; reason: "not_pricing_v2" | "invalid_user_count" | "invalid_pack" | "invalid_credits" | "invalid_interval" };

const PACK_SIZES = PRICING_V2_MONTHLY_PACKS.map((p) => p.credits);

/** Telo `POST /api/billing/credits/checkout` pre v2. Neznámy typ vráti `not_pricing_v2` (patrí legacy vetve). */
export function parsePricingV2CheckoutRequest(body: unknown): PricingV2CheckoutParseResult {
  if (typeof body !== "object" || body === null) return { ok: false, reason: "not_pricing_v2" };
  const b = body as Record<string, unknown>;
  const type = b.checkoutType ?? b.type;

  if (type === PRICING_V2_CHECKOUT_TYPE_PLAN) {
    const band = resolvePricingV2BandResult(b.users as number);
    if (!band.ok) return { ok: false, reason: "invalid_user_count" };
    const rawInterval = b.interval ?? "month";
    if (!isPricingV2Interval(rawInterval)) return { ok: false, reason: "invalid_interval" };
    const rawPack = b.packCredits;
    if (rawPack === undefined || rawPack === null || rawPack === 0) {
      return { ok: true, value: { checkoutType: type, users: b.users as number, packCredits: null, interval: rawInterval } };
    }
    if (typeof rawPack !== "number" || !PACK_SIZES.includes(rawPack)) return { ok: false, reason: "invalid_pack" };
    // Mesačný balík a ročný plán sa v jednom predplatnom miešať nedajú (Stripe: všetky položky majú rovnaký interval).
    if (rawInterval === "year") return { ok: false, reason: "invalid_pack" };
    return { ok: true, value: { checkoutType: type, users: b.users as number, packCredits: rawPack, interval: rawInterval } };
  }

  if (type === PRICING_V2_CHECKOUT_TYPE_CREDITS) {
    const credits = b.credits;
    if (typeof credits !== "number" || !Number.isSafeInteger(credits) || credits < 1) {
      return { ok: false, reason: "invalid_credits" };
    }
    if (!Number.isSafeInteger(credits * PRICING_V2_CREDIT_NET_CENTS)) return { ok: false, reason: "invalid_credits" };
    return { ok: true, value: { checkoutType: type, credits } };
  }

  return { ok: false, reason: "not_pricing_v2" };
}

/** Metadáta Stripe Checkout Session (všetky hodnoty sú reťazce). */
export type PricingV2PlanCheckoutMetadata = {
  checkoutType: typeof PRICING_V2_CHECKOUT_TYPE_PLAN;
  agencyId: string;
  authUserId: string;
  profileId: string;
  bandId: PricingV2BandId;
  users: string;
  /** "0" = bez balíka */
  packCredits: string;
  interval: PricingV2Interval;
};

export type PricingV2CreditsCheckoutMetadata = {
  checkoutType: typeof PRICING_V2_CHECKOUT_TYPE_CREDITS;
  agencyId: string;
  authUserId: string;
  profileId: string;
  credits: string;
};

export function buildPricingV2PlanMetadata(input: {
  agencyId: string;
  authUserId: string;
  profileId: string;
  users: number;
  packCredits: number | null;
  interval?: PricingV2Interval;
}): PricingV2PlanCheckoutMetadata {
  const band = resolvePricingV2BandResult(input.users);
  if (!band.ok) throw new RangeError(`Neplatný počet používateľov: ${input.users}`);
  if (!input.agencyId.trim()) throw new RangeError("Chýba agencyId.");
  return {
    checkoutType: PRICING_V2_CHECKOUT_TYPE_PLAN,
    agencyId: input.agencyId,
    authUserId: input.authUserId,
    profileId: input.profileId,
    bandId: band.band.id,
    users: String(input.users),
    packCredits: String(input.packCredits ?? 0),
    interval: input.interval ?? "month",
  };
}

export type PricingV2PlanFulfillment = {
  agencyId: string;
  authUserId: string;
  bandId: PricingV2BandId;
  users: number;
  packCredits: number;
  interval: PricingV2Interval;
};

/** Webhook: prečíta a OVERÍ metadáta (nič nedôveruje slepo). Neplatné → null (fulfillment sa nesmie tváriť, že prešiel). */
export function readPricingV2PlanMetadata(meta: Record<string, string | null | undefined> | null | undefined): PricingV2PlanFulfillment | null {
  if (!meta || meta.checkoutType !== PRICING_V2_CHECKOUT_TYPE_PLAN) return null;
  const agencyId = (meta.agencyId ?? "").trim();
  if (!agencyId) return null;
  const users = Number(meta.users);
  const band = resolvePricingV2BandResult(users);
  if (!band.ok) return null;
  if (meta.bandId !== band.band.id) return null;
  const packCredits = Number(meta.packCredits ?? "0");
  if (packCredits !== 0 && !PACK_SIZES.includes(packCredits)) return null;
  // Staršie relácie bez poľa `interval` sú mesačné; neznáma hodnota je chyba (nie potichu mesačná).
  const rawInterval = meta.interval ?? "month";
  if (!isPricingV2Interval(rawInterval)) return null;
  if (rawInterval === "year" && packCredits !== 0) return null;
  return { agencyId, authUserId: (meta.authUserId ?? "").trim(), bandId: band.band.id, users, packCredits, interval: rawInterval };
}

export function readPricingV2CreditsMetadata(
  meta: Record<string, string | null | undefined> | null | undefined,
): { agencyId: string; credits: number } | null {
  if (!meta || meta.checkoutType !== PRICING_V2_CHECKOUT_TYPE_CREDITS) return null;
  const agencyId = (meta.agencyId ?? "").trim();
  const credits = Number(meta.credits);
  if (!agencyId || !Number.isSafeInteger(credits) || credits < 1) return null;
  return { agencyId, credits };
}

/** Odpoveď `GET /api/billing/checkout-config` rozširuje o pole `pricingV2` (ostatné polia ostávajú nezmenené). */
export type PricingV2ConfigPayload = {
  enabled: boolean;
  /** true len ak je v2 zapnuté A všetky potrebné Stripe price ID sú platné */
  checkoutAvailable: boolean;
  /** len NÁZVY env premenných, nikdy hodnoty */
  missingPriceEnvKeys: string[];
  /** null, keď v2 nie je zapnuté */
  catalog: PricingV2Catalog | null;
  /** true = predávajú sa len plány: `catalog.packs` je prázdne a dokúpenie kreditov sa neponúka */
  plansOnly?: boolean;
  /** true, ak je nastavená ročná cena licencie: až vtedy sa ponúka ročné platenie */
  yearlyAvailable?: boolean;
};

/** Mapovanie pásma na `agencies.account_tier` (rovnaké hodnoty ako legacy seat tier → existujúce gating funguje). */
export const PRICING_V2_BAND_ACCOUNT_TIER: Record<PricingV2BandId, "starter" | "pro" | "enterprise"> = {
  start: "starter",
  team: "pro",
  office: "enterprise",
  network: "enterprise",
};

/** Hodnoty stĺpca `agencies.pricing_model` pre v2; NULL = legacy. */
export const PRICING_V2_AGENCY_MODEL = "v2" as const;

/** Chýbajúca ročná cena licencie (ročné platenie sa ponúka len keď nechýba). */
export function missingPricingV2YearlyPriceEnvKeys(env: Record<string, string | undefined> = process.env): string[] {
  return [PRICING_V3_SEAT_YEARLY_PRICE_ENV].filter((name) => !isValidStripePriceId(env[name]));
}

/**
 * Názvy env premenných s chýbajúcim alebo neplatným Stripe price ID (placeholder `price_xxx` neprejde).
 * Mesačná cena licencie je vždy povinná; v režime „len plány“ sa balíky a kredit nevyžadujú.
 * Ročná cena a kupón sa hlásia samostatne (`missingPricingV2YearlyPriceEnvKeys`), mesačný predaj neblokujú.
 */
export function missingPricingV2PriceEnvKeys(env: Record<string, string | undefined> = process.env): string[] {
  const names = [
    PRICING_V3_SEAT_MONTHLY_PRICE_ENV,
    ...(isPricingV2PlansOnly(env) ? [] : [...PACK_SIZES.map((size) => PRICING_V2_PACK_PRICE_ENV[size]), PRICING_V2_CREDIT_PRICE_ENV]),
  ];
  return names.filter((name) => !isValidStripePriceId(env[name]));
}
