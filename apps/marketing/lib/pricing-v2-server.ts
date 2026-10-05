/**
 * Server-side vstup cenníka v2 (číta env). Nepoužívať v klientských komponentoch.
 */
import { buildPricingV2Catalog, isPricingV2Enabled } from './pricing'
import { buildPricingV2View, type PricingV2View } from './pricing-v2-view'

/**
 * Server-side vstup: `null` = v2 vypnuté (legacy výstup, nič sa nemení).
 * Prepínač sa číta rovnako ako v CRM (`PRICING_V2_ENABLED` cez `isPricingV2Enabled`).
 */
export function resolvePricingV2View(env: Record<string, string | undefined> = process.env): PricingV2View | null {
  if (!isPricingV2Enabled(env)) return null
  return buildPricingV2View(buildPricingV2Catalog(), env.NEXT_PUBLIC_CRM_URL)
}
