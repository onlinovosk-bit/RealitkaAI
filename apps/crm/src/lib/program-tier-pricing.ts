/**
 * L99 seat-based ceny (EUR mesačne na makléra).
 * Zdroj pravdy pre pricing copy v marketingu a CRM.
 */
export const PLAN_PRICES_EUR = {
  soloSeat: 79,
  teamSeat: 71,
  officeSeat: 63,
} as const;

/** Historická kotva pre porovnanie upsellu na tímový režim. */
export function activeForceAnchoredFullTierReferenceEur(): number {
  return PLAN_PRICES_EUR.teamSeat;
}

/** Limitovaný founder pool — hodnoty upravuje produkt/marketing jedným miestom. */
export const FOUNDER_KANCELARIE_POOL_TOTAL = 20;
/** Obsadené / udelené miesta v founder pooli (zvyšuje sa manuálne pri zmene reality). */
export const FOUNDER_KANCELARIE_POOL_CLAIMED = 13;

export function founderKancelarieRemaining(): number {
  return Math.max(0, FOUNDER_KANCELARIE_POOL_TOTAL - FOUNDER_KANCELARIE_POOL_CLAIMED);
}

/** Team / enterprise balík na landingu (SKU mimo štvorcového rebríčka v appke). */
export const LANDING_ENTERPRISE_TEAM_PACK_EUR = 355;
export const LANDING_ENTERPRISE_ACTIVE_FORCE_SEATS = 5;

export function landingEnterpriseAttributedActiveForceValueEur(): number {
  return LANDING_ENTERPRISE_ACTIVE_FORCE_SEATS * PLAN_PRICES_EUR.teamSeat;
}

/** Add-on moduly v L99 stratégii (EUR/mesiac na tenant). */
export const L99_ADDON_MODULE_PRICES_EUR = {
  leadsEngine: 79,
  marketIntelligence: 99,
  protocolAI: 149,
  activeForceCalls: 59,
  crmSync: 49,
  whiteLabel: 299,
} as const;
