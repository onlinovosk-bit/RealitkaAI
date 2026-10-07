/**
 * Server-side vstup cenníka v2 (číta env). Nepoužívať v klientských komponentoch.
 */
import { buildPricingV2Catalog, isPricingV2PlansOnly } from './pricing'
import { buildPricingV2View, type PricingV2View } from './pricing-v2-view'

type Env = Record<string, string | undefined>

/**
 * Verejný web ukazuje cenník v2 PREDVOLENE (rozhodnutie foundera 6. 10. 2026: nový cenník je oficiálny a web ho
 * má ukazovať ešte pred spustením platieb). Staré seat ceny sa vrátia len výslovným `PRICING_V2_ENABLED=false`
 * (alebo `0` / `off` / `no`). Toto platí len pre marketing; CRM má vlastný, stále vypnutý prepínač.
 */
export function isWebPricingV2Enabled(env: Env = process.env): boolean {
  const raw = env.PRICING_V2_ENABLED?.trim().toLowerCase()
  return !(raw === 'false' || raw === '0' || raw === 'off' || raw === 'no')
}

/**
 * CTA vedú do registrácie v CRM LEN pri výslovnom `PRICING_V2_SIGNUP_ENABLED=true|1|on`
 * (až keď existujú Stripe ceny, CRM checkout a funnel zachováva plán). Do tej doby všetky CTA vedú na demo,
 * takže zákazník nikdy nepríde z webu do CRM s inou cenou, než videl.
 */
export function isWebSignupEnabled(env: Env = process.env): boolean {
  const raw = env.PRICING_V2_SIGNUP_ENABLED?.trim().toLowerCase()
  return raw === 'true' || raw === '1' || raw === 'on'
}

/** `null` = legacy výstup (len pri výslovnom vypnutí). */
export function resolvePricingV2View(env: Env = process.env): PricingV2View | null {
  if (!isWebPricingV2Enabled(env)) return null
  return buildPricingV2View(buildPricingV2Catalog(), env.NEXT_PUBLIC_CRM_URL, {
    plansOnly: isPricingV2PlansOnly(env),
    signupEnabled: isWebSignupEnabled(env),
  })
}
