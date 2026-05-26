/**
 * Kanonické ceny stupňov (EUR mesačne, kde aplikácia používa /mes makléra).
 * Zdroj pravdy spoločný pre landing FinalCTA aj stránku porovnanie programov.
 */
export const PLAN_PRICES_EUR = {
  smartStart: 49,
  activeForce: 99,
  marketVision: 199,
  protocolAuthority: 449,
} as const;

/** „Kotva“ vyššieho stupňa vo founder copy (aktuálny cenník: Strážca cien a ziskov). */
export function activeForceAnchoredFullTierReferenceEur(): number {
  return PLAN_PRICES_EUR.marketVision;
}

/** Limitovaný founder pool — hodnoty upravuje produkt/marketing jedným miestom. */
export const FOUNDER_KANCELARIE_POOL_TOTAL = 20;
/** Obsadené / udelené miesta v founder pooli (zvyšuje sa manuálne pri zmene reality). */
export const FOUNDER_KANCELARIE_POOL_CLAIMED = 13;

export function founderKancelarieRemaining(): number {
  return Math.max(0, FOUNDER_KANCELARIE_POOL_TOTAL - FOUNDER_KANCELARIE_POOL_CLAIMED);
}

/** Team / enterprise balík na landingu (SKU mimo štvorcového rebríčka v appke). */
export const LANDING_ENTERPRISE_TEAM_PACK_EUR = 399;
export const LANDING_ENTERPRISE_ACTIVE_FORCE_SEATS = 5;

export function landingEnterpriseAttributedActiveForceValueEur(): number {
  return LANDING_ENTERPRISE_ACTIVE_FORCE_SEATS * PLAN_PRICES_EUR.activeForce;
}
