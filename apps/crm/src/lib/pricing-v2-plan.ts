/**
 * Cenník v2 → plán v CRM (zobrazenie, limity a príznaky funkcií).
 *
 * Plán zákazníka sa zisťuje zo Stripe predplatného (cena prvej položky). V2 predplatné nesie dve
 * položky (pásmo + voliteľný balík kreditov) a price ID pásma legacy mapy nepoznajú — bez tejto
 * vrstvy by platiaci v2 zákazník dostal plán „free“ so zlými limitmi.
 * Čisté funkcie bez Stripe a DB.
 */
import { resolvePricingV2PriceRole } from "@/lib/credits-billing-v2";
import type { PricingV2BandId } from "@/lib/pricing-v2";

type Env = Record<string, string | undefined>;

export type PlanPriceItem = { priceId?: string | null };

/** Pásmo v2, ktoré predstavuje Stripe price ID; balík kreditov a kredit sú „nie pásmo“. */
export function pricingV2BandOfPriceId(
  priceId: string | null | undefined,
  env: Env = process.env,
): PricingV2BandId | null {
  const role = resolvePricingV2PriceRole(priceId, env);
  return role?.kind === "band" ? role.bandId : null;
}

/**
 * Cena, ktorá určuje plán: v2 pásmo má prednosť (Stripe poradie položiek negarantuje),
 * inak prvá položka ako doteraz.
 */
export function planPriceIdOf(
  items: ReadonlyArray<PlanPriceItem> | null | undefined,
  env: Env = process.env,
): string | null {
  const list = items ?? [];
  for (const item of list) {
    if (pricingV2BandOfPriceId(item?.priceId, env)) return item.priceId ?? null;
  }
  return list[0]?.priceId ?? null;
}

export type SaasPlanKey = "free" | "starter" | "pro" | "scale";

/** Pásmo v2 → plán v `saas-ops` (rovnako ako `account_tier`: enterprise sa tu volá „scale“). */
const SAAS_PLAN_BY_BAND: Record<PricingV2BandId, Exclude<SaasPlanKey, "free">> = {
  start: "starter",
  team: "pro",
  office: "scale",
  network: "scale",
};

export function saasPlanKeyFromPriceId(priceId: string | null | undefined, env: Env = process.env): SaasPlanKey {
  if (!priceId) return "free";

  if (priceId === env.STRIPE_PRICE_STARTER) return "starter";
  if (priceId === env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === env.STRIPE_PRICE_SCALE) return "scale";

  const band = pricingV2BandOfPriceId(priceId, env);
  if (band) return SAAS_PLAN_BY_BAND[band];

  return "free";
}
