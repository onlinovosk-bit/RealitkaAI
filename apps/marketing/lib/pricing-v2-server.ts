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
 * Primárne nákupné CTA vedú do 14-dňovej skúšky v CRM (`/register`, plán Start, bez karty) PREDVOLENE.
 * Calendly ostáva len ako vedľajší odkaz. Núdzový vypínač: výslovné `PRICING_V2_SIGNUP_ENABLED=false`
 * (alebo `0` / `off` / `no`) — vtedy všetky primárne CTA idú na demo, aby web neposielal ľudí
 * na rozbitú registráciu. Samotné založenie kancelárie v CRM ostáva za `SELF_SERVE_SIGNUP_ENABLED`
 * (fail-closed); `/register` pri vypnutej vlajke ukáže zatvorenú stránku, nie fiktívny trial.
 */
export function isWebSignupEnabled(env: Env = process.env): boolean {
  const raw = env.PRICING_V2_SIGNUP_ENABLED?.trim().toLowerCase()
  return !(raw === 'false' || raw === '0' || raw === 'off' || raw === 'no')
}

/** `null` = legacy výstup (len pri výslovnom vypnutí). */
export function resolvePricingV2View(env: Env = process.env): PricingV2View | null {
  if (!isWebPricingV2Enabled(env)) return null
  return buildPricingV2View(buildPricingV2Catalog(), env.NEXT_PUBLIC_CRM_URL, {
    plansOnly: isPricingV2PlansOnly(env),
    signupEnabled: isWebSignupEnabled(env),
  })
}
