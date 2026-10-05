/**
 * Cenník v2 — ZMRAZENÉ rozhranie pre vlnu W2 (vetvy A–D).
 *
 * Vetvy sa tu nedotýkajú tvarov; ak treba zmenu, vracia sa to ku koordinátorovi, nie sa upravuje lokálne.
 * Čisté funkcie bez Stripe a bez DB. Ceny a pásma sú v `pricing-v2.ts` (W1).
 * Špecifikácia: docs/pricing/2026-10-05-pricing-v2-w2-contract.md
 */
import { isValidStripePriceId } from "@/lib/program-tier-pricing";
import {
  PRICING_V2_BAND_IDS,
  isPricingV2PlansOnly,
  PRICING_V2_MONTHLY_PACKS,
  resolvePricingV2Band,
  type PricingV2BandId,
  type PricingV2Catalog,
} from "@/lib/pricing-v2";

export const PRICING_V2_CHECKOUT_TYPE_PLAN = "pricing_v2" as const;
export const PRICING_V2_CHECKOUT_TYPE_CREDITS = "pricing_v2_credits" as const;

/** Stripe Price ID kľúče (NÁZVY env premenných; hodnoty nikdy nelogovať ani nevracať). */
export const PRICING_V2_BAND_PRICE_ENV: Record<PricingV2BandId, string> = {
  start: "STRIPE_PRICE_V2_START",
  team: "STRIPE_PRICE_V2_TEAM",
  office: "STRIPE_PRICE_V2_OFFICE",
  network: "STRIPE_PRICE_V2_NETWORK",
};

export const PRICING_V2_PACK_PRICE_ENV: Record<number, string> = {
  60: "STRIPE_PRICE_V2_PACK_60",
  120: "STRIPE_PRICE_V2_PACK_120",
  180: "STRIPE_PRICE_V2_PACK_180",
  240: "STRIPE_PRICE_V2_PACK_240",
  300: "STRIPE_PRICE_V2_PACK_300",
};

/** Jednorazové dokúpenie kreditov: jeden Stripe price s jednotkovou cenou 0,70 € bez DPH, množstvo = počet kreditov. */
export const PRICING_V2_CREDIT_PRICE_ENV = "STRIPE_PRICE_V2_CREDIT";

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
  | { checkoutType: typeof PRICING_V2_CHECKOUT_TYPE_PLAN; users: number; packCredits: number | null }
  | { checkoutType: typeof PRICING_V2_CHECKOUT_TYPE_CREDITS; credits: number };

export type PricingV2CheckoutParseResult =
  | { ok: true; value: PricingV2CheckoutRequest }
  | { ok: false; reason: "not_pricing_v2" | "invalid_user_count" | "invalid_pack" | "invalid_credits" };

const PACK_SIZES = PRICING_V2_MONTHLY_PACKS.map((p) => p.credits);

/** Telo `POST /api/billing/credits/checkout` pre v2. Neznámy typ vráti `not_pricing_v2` (patrí legacy vetve). */
export function parsePricingV2CheckoutRequest(body: unknown): PricingV2CheckoutParseResult {
  if (typeof body !== "object" || body === null) return { ok: false, reason: "not_pricing_v2" };
  const b = body as Record<string, unknown>;
  const type = b.checkoutType ?? b.type;

  if (type === PRICING_V2_CHECKOUT_TYPE_PLAN) {
    const band = resolvePricingV2Band(b.users as number);
    if (!band.ok) return { ok: false, reason: "invalid_user_count" };
    const rawPack = b.packCredits;
    if (rawPack === undefined || rawPack === null || rawPack === 0) {
      return { ok: true, value: { checkoutType: type, users: b.users as number, packCredits: null } };
    }
    if (typeof rawPack !== "number" || !PACK_SIZES.includes(rawPack)) return { ok: false, reason: "invalid_pack" };
    return { ok: true, value: { checkoutType: type, users: b.users as number, packCredits: rawPack } };
  }

  if (type === PRICING_V2_CHECKOUT_TYPE_CREDITS) {
    const credits = b.credits;
    if (typeof credits !== "number" || !Number.isSafeInteger(credits) || credits < 1) {
      return { ok: false, reason: "invalid_credits" };
    }
    if (!Number.isSafeInteger(credits * 70)) return { ok: false, reason: "invalid_credits" };
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
}): PricingV2PlanCheckoutMetadata {
  const band = resolvePricingV2Band(input.users);
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
  };
}

export type PricingV2PlanFulfillment = {
  agencyId: string;
  authUserId: string;
  bandId: PricingV2BandId;
  users: number;
  packCredits: number;
};

/** Webhook: prečíta a OVERÍ metadáta (nič nedôveruje slepo). Neplatné → null (fulfillment sa nesmie tváriť, že prešiel). */
export function readPricingV2PlanMetadata(meta: Record<string, string | null | undefined> | null | undefined): PricingV2PlanFulfillment | null {
  if (!meta || meta.checkoutType !== PRICING_V2_CHECKOUT_TYPE_PLAN) return null;
  const agencyId = (meta.agencyId ?? "").trim();
  if (!agencyId) return null;
  const users = Number(meta.users);
  const band = resolvePricingV2Band(users);
  if (!band.ok) return null;
  if (meta.bandId !== band.band.id) return null;
  const packCredits = Number(meta.packCredits ?? "0");
  if (packCredits !== 0 && !PACK_SIZES.includes(packCredits)) return null;
  return { agencyId, authUserId: (meta.authUserId ?? "").trim(), bandId: band.band.id, users, packCredits };
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

/**
 * Názvy env premenných s chýbajúcim alebo neplatným Stripe price ID (placeholder `price_xxx` neprejde).
 * V režime „len plány“ sa vyžadujú iba ceny plánov; balíky a kredit sa nepredávajú, takže ich chýbanie nič neblokuje.
 */
export function missingPricingV2PriceEnvKeys(env: Record<string, string | undefined> = process.env): string[] {
  const names = [
    ...PRICING_V2_BAND_IDS.map((id) => PRICING_V2_BAND_PRICE_ENV[id]),
    ...(isPricingV2PlansOnly(env) ? [] : [...PACK_SIZES.map((size) => PRICING_V2_PACK_PRICE_ENV[size]), PRICING_V2_CREDIT_PRICE_ENV]),
  ];
  return names.filter((name) => !isValidStripePriceId(env[name]));
}
