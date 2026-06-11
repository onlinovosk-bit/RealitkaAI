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

/** Legacy checkout source keys used by LeadCaptureModal / subscription API. */
export const SEAT_TIER_CHECKOUT_SOURCE = {
  solo: 'pricing-smart-start',
  team: 'pricing-active-force',
  office: 'pricing-market-vision',
} as const
