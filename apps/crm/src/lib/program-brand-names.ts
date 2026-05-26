/**
 * Produktové názvy tierov — zdroj pravdy pre marketing/UI.
 * Nepremenúvaj vnútorné kľúče (`account_tier`, Stripe IDs); len používaj tieto reťazce pri zobrazení.
 */
export const PROGRAM_BRAND_LABEL = {
  starter: 'Smart Start',
  active: 'Radar makléra',
  market: 'Strážca cien a ziskov',
  protocol: 'Reality Monopol',
} as const;

export type ProgramBrandTier = keyof typeof PROGRAM_BRAND_LABEL;

/** `account_tier` / vnútorné snake_case mapované na značkový názov pre UI */
export function brandLabelFromAccountTier(
  tier: string | null | undefined,
): string {
  switch (tier) {
    case 'starter':
    case 'free':
      return PROGRAM_BRAND_LABEL.starter;
    case 'active_force':
    case 'active':
      return PROGRAM_BRAND_LABEL.active;
    case 'market_vision':
      return PROGRAM_BRAND_LABEL.market;
    case 'protocol_authority':
      return PROGRAM_BRAND_LABEL.protocol;
    default:
      return PROGRAM_BRAND_LABEL.starter;
  }
}
