/**
 * Marketing pricing display — re-export from CRM canonical source.
 * @see apps/crm/src/lib/program-tier-pricing.ts
 */
export {
  PLAN_PRICES_EUR,
  SEAT_TIERS,
  SEAT_TIER_CONFIG,
  CREDIT_GRANTS,
  COCKPIT_PRODUCTS,
  COCKPIT_LITE_MIN_SEATS,
  ownerCockpitPriceEur,
  isFounderKancelariaEligible,
  founderKancelarieRemaining,
  areSeatCheckoutPricesConfigured,
  formatSeatPriceLabel,
} from '../../crm/src/lib/program-tier-pricing'

export type { SeatTier } from '../../crm/src/lib/program-tier-pricing'

/**
 * Cenník v2 (paušál na kanceláriu) — re-export z CRM, rovnaký vzor ako vyššie.
 * Zapína ho `PRICING_V2_ENABLED` (rovnaký názov env ako v CRM, predvolene vypnuté).
 * @see apps/crm/src/lib/pricing-v2.ts
 */
export {
  buildPricingV2Catalog,
  isPricingV2Enabled,
  isPricingV2PlansOnly,
  PRICING_V2_VAT_PERCENT_DEFAULT,
} from '../../crm/src/lib/pricing-v2'

export type { PricingV2Catalog, PricingV2BandId } from '../../crm/src/lib/pricing-v2'

/** Legacy checkout source keys used by LeadCaptureModal / subscription API. */
export const SEAT_TIER_CHECKOUT_SOURCE = {
  solo: 'pricing-smart-start',
  team: 'pricing-active-force',
  office: 'pricing-market-vision',
} as const
