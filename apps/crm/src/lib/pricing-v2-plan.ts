/**
 * Cenník v3 (modul ostáva `pricing-v2`) → plán v CRM (zobrazenie, limity a príznaky funkcií).
 *
 * Plán zákazníka sa zisťuje zo Stripe predplatného (cena prvej položky). V2 predplatné nesie dve
 * položky (pásmo + voliteľný balík kreditov) a price ID pásma legacy mapy nepoznajú — bez tejto
 * vrstvy by platiaci v2 zákazník dostal plán „free“ so zlými limitmi.
 * Čisté funkcie bez Stripe a DB.
 */
import { resolvePricingV2PriceRole } from "@/lib/credits-billing-v2";
import { resolvePricingV2BandResult, type PricingV2BandId } from "@/lib/pricing-v2";

type Env = Record<string, string | undefined>;

export type PlanPriceItem = { priceId?: string | null; quantity?: number | null };

/**
 * Pásmo, ktoré predstavuje cena licencie pri danom počte maklérov (`quantity`). V3 má jednu cenu na interval,
 * takže pásmo vyplýva z množstva, nie z price ID. Balík kreditov, kredit, cena bez množstva
 * alebo neplatné množstvo pásmo nedávajú (null).
 */
export function pricingV2BandOfPriceId(
  priceId: string | null | undefined,
  env: Env = process.env,
  quantity?: number | null,
): PricingV2BandId | null {
  const role = resolvePricingV2PriceRole(priceId, env);
  if (role?.kind !== "seat" || typeof quantity !== "number") return null;
  const r = resolvePricingV2BandResult(quantity);
  return r.ok ? r.band.id : null;
}

/** True, ak je cena licencie v3 (bez ohľadu na množstvo). */
export function isPricingV2SeatPriceId(priceId: string | null | undefined, env: Env = process.env): boolean {
  return resolvePricingV2PriceRole(priceId, env)?.kind === "seat";
}

/**
 * Položka, ktorá určuje plán: licencia v3 má prednosť (Stripe poradie položiek negarantuje),
 * inak prvá položka ako doteraz.
 */
export function planItemOf(
  items: ReadonlyArray<PlanPriceItem> | null | undefined,
  env: Env = process.env,
): PlanPriceItem | null {
  const list = items ?? [];
  for (const item of list) {
    if (isPricingV2SeatPriceId(item?.priceId, env)) return item;
  }
  return list[0] ?? null;
}

/** Cena, ktorá určuje plán (viď `planItemOf`). */
export function planPriceIdOf(
  items: ReadonlyArray<PlanPriceItem> | null | undefined,
  env: Env = process.env,
): string | null {
  return planItemOf(items, env)?.priceId ?? null;
}

export type SaasPlanKey = "free" | "starter" | "pro" | "scale";

/** Pásmo v2 → plán v `saas-ops` (rovnako ako `account_tier`: enterprise sa tu volá „scale“). */
const SAAS_PLAN_BY_BAND: Record<PricingV2BandId, Exclude<SaasPlanKey, "free">> = {
  start: "starter",
  team: "pro",
  office: "scale",
  network: "scale",
};

/**
 * Plán z ceny. Cena licencie v3 bez známeho množstva je najnižší platený plán (starter), nikdy free:
 * zákazník, ktorý platí, nesmie prísť o prístup len preto, že volajúci nepodal množstvo.
 */
export function saasPlanKeyFromPriceId(
  priceId: string | null | undefined,
  env: Env = process.env,
  quantity?: number | null,
): SaasPlanKey {
  if (!priceId) return "free";

  if (priceId === env.STRIPE_PRICE_STARTER) return "starter";
  if (priceId === env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === env.STRIPE_PRICE_SCALE) return "scale";

  if (isPricingV2SeatPriceId(priceId, env)) {
    const band = pricingV2BandOfPriceId(priceId, env, quantity);
    return band ? SAAS_PLAN_BY_BAND[band] : "starter";
  }

  return "free";
}
