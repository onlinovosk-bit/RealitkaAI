import type { PlanKey } from "@/lib/billing-types";
import { PLAN_KEYS } from "@/lib/billing-types";

/**
 * L99 pricing stack v1.0 — jediný zdroj pravdy pre seat, cockpit, kredity, add-ony.
 * @see apps/crm/docs/pricing-v1.md
 */
export const PLAN_PRICES_EUR = {
  soloSeat: 79,
  teamSeat: 71,
  officeSeat: 63,
} as const;

/** Self-serve seat tiers (Vrstva 1). */
export const SEAT_TIERS = ["solo", "team", "office"] as const;
export type SeatTier = (typeof SEAT_TIERS)[number];

export const SEAT_TIER_STRIPE_ENV: Record<SeatTier, string> = {
  solo: "STRIPE_PRICE_SOLO_SEAT",
  team: "STRIPE_PRICE_TEAM_SEAT",
  office: "STRIPE_PRICE_OFFICE_SEAT",
};

/** Mesačný grant kreditov na seat (agency pool pri mesačnom grante). */
export const CREDIT_GRANTS: Record<SeatTier, number> = {
  solo: 30,
  team: 25,
  office: 20,
};

export type SeatTierConfig = {
  label: string;
  priceEur: number;
  minSeats: number;
  defaultSeats: number;
  monthlyGrantPerSeat: number;
  planKey: PlanKey;
};

export const SEAT_TIER_CONFIG: Record<SeatTier, SeatTierConfig> = {
  solo: {
    label: "Solo Seat",
    priceEur: PLAN_PRICES_EUR.soloSeat,
    minSeats: 1,
    defaultSeats: 1,
    monthlyGrantPerSeat: CREDIT_GRANTS.solo,
    planKey: PLAN_KEYS.STARTER,
  },
  team: {
    label: "Team Seat",
    priceEur: PLAN_PRICES_EUR.teamSeat,
    minSeats: 3,
    defaultSeats: 3,
    monthlyGrantPerSeat: CREDIT_GRANTS.team,
    planKey: PLAN_KEYS.PRO,
  },
  office: {
    label: "Office Seat",
    priceEur: PLAN_PRICES_EUR.officeSeat,
    minSeats: 10,
    defaultSeats: 10,
    monthlyGrantPerSeat: CREDIT_GRANTS.office,
    planKey: PLAN_KEYS.ENTERPRISE,
  },
};

/** Vrstva 2 — Cockpit (agency-level, nemíňa kredity). */
export const COCKPIT_LITE_MIN_SEATS = 3;

export type CockpitProductKey = "lite" | "owner" | "ownerPro";

export type CockpitProductConfig = {
  key: CockpitProductKey;
  label: string;
  priceEur: number;
  grantCredits: number;
  minSeats: number;
  /** Self-serve checkout / Stripe */
  enabled: boolean;
  /** Founder kancelárie — fixná cena navždy (ak eligible). */
  founderPriceEur?: number;
  stripeEnvKey?: string;
  founderStripeEnvKey?: string;
};

export const COCKPIT_PRODUCTS: Record<CockpitProductKey, CockpitProductConfig> = {
  lite: {
    key: "lite",
    label: "Cockpit Lite",
    priceEur: 0,
    grantCredits: 0,
    minSeats: COCKPIT_LITE_MIN_SEATS,
    enabled: true,
  },
  owner: {
    key: "owner",
    label: "Owner Cockpit",
    priceEur: 349,
    grantCredits: 100,
    minSeats: 3,
    enabled: true,
    founderPriceEur: 249,
    stripeEnvKey: "STRIPE_PRICE_OWNER_COCKPIT",
    founderStripeEnvKey: "STRIPE_PRICE_OWNER_COCKPIT_FOUNDER",
  },
  ownerPro: {
    key: "ownerPro",
    label: "Owner Cockpit Pro",
    priceEur: 499,
    grantCredits: 200,
    minSeats: 3,
    enabled: false,
    stripeEnvKey: "STRIPE_PRICE_OWNER_COCKPIT_PRO",
  },
};

/** Spotrebný cenník kreditov (Vrstva 3). */
export const CREDIT_ACTION_COSTS = {
  leadUnlock: 4,
  leadAnalysis: 1,
  aiEmail: 1,
  listingDescription: 2,
} as const;

export type CreditActionKey = keyof typeof CREDIT_ACTION_COSTS;

/** G2 — Maklérsky štartovací balík (low-ticket, marketing /balik). */
export const STARTER_PACK = {
  label: "Maklérsky štartovací balík",
  priceEur: 47,
  creditValue: 47,
  stripeEnvKey: "STRIPE_PRICE_STARTER_PACK",
  checkoutType: "starter_pack" as const,
} as const;

/** Top-up balíčky — one-time Stripe Checkout (karta). */
export const TOPUP_PACKAGE_KEYS = ["start", "rast", "pro", "mega"] as const;
export type TopupPackageKey = (typeof TOPUP_PACKAGE_KEYS)[number];

export type TopupPackageConfig = {
  key: TopupPackageKey;
  label: string;
  credits: number;
  priceEur: number;
  stripeEnvKey: string;
  /** UI highlight */
  featured?: boolean;
};

export const TOPUP_PACKAGES: Record<TopupPackageKey, TopupPackageConfig> = {
  start: {
    key: "start",
    label: "Štart",
    credits: 50,
    priceEur: 49,
    stripeEnvKey: "STRIPE_PRICE_CREDITS_START",
  },
  rast: {
    key: "rast",
    label: "Rast",
    credits: 150,
    priceEur: 129,
    stripeEnvKey: "STRIPE_PRICE_CREDITS_RAST",
    featured: true,
  },
  pro: {
    key: "pro",
    label: "Pro",
    credits: 500,
    priceEur: 379,
    stripeEnvKey: "STRIPE_PRICE_CREDITS_PRO",
  },
  mega: {
    key: "mega",
    label: "Mega",
    credits: 1500,
    priceEur: 999,
    stripeEnvKey: "STRIPE_PRICE_CREDITS_MEGA",
  },
};

/** Auto-recharge defaults (opt-in owner). */
export const CREDIT_AUTO_RECHARGE_DEFAULTS = {
  thresholdPercentOfMonthlyGrant: 20,
  defaultPackageKey: "rast" as TopupPackageKey,
  defaultMonthlyCapEur: 500,
};

/** Historická kotva pre porovnanie upsellu na tímový režim. */
export function activeForceAnchoredFullTierReferenceEur(): number {
  return PLAN_PRICES_EUR.teamSeat;
}

/** Limitovaný founder pool — hodnoty upravuje produkt/marketing jedným miestom. */
export const FOUNDER_KANCELARIE_POOL_TOTAL = 20;
export const FOUNDER_KANCELARIE_POOL_CLAIMED = 13;

export function founderKancelarieRemaining(): number {
  return Math.max(0, FOUNDER_KANCELARIE_POOL_TOTAL - FOUNDER_KANCELARIE_POOL_CLAIMED);
}

export function isFounderKancelariaEligible(): boolean {
  return founderKancelarieRemaining() > 0;
}

export function ownerCockpitPriceEur(opts?: { founderEligible?: boolean }): number {
  const owner = COCKPIT_PRODUCTS.owner;
  if (opts?.founderEligible && owner.founderPriceEur != null) {
    return owner.founderPriceEur;
  }
  return owner.priceEur;
}

/** Team / enterprise balík na landingu (SKU mimo štvorcového rebríčka v appke). */
export const LANDING_ENTERPRISE_TEAM_PACK_EUR = 355;
export const LANDING_ENTERPRISE_ACTIVE_FORCE_SEATS = 5;

export function landingEnterpriseAttributedActiveForceValueEur(): number {
  return LANDING_ENTERPRISE_ACTIVE_FORCE_SEATS * PLAN_PRICES_EUR.teamSeat;
}

/** Legacy add-on ceny — Stripe resolver / história; nie na predajnom UI. */
export const L99_LEGACY_ADDON_MODULE_PRICES_EUR = {
  leadsEngine: 79,
  marketIntelligence: 99,
  protocolAI: 149,
  activeForceCalls: 59,
} as const;

export type L99LegacyAddonKey = keyof typeof L99_LEGACY_ADDON_MODULE_PRICES_EUR;

/** Add-on moduly v predaji (Vrstva 4). */
export const L99_PURCHASABLE_ADDON_MODULE_PRICES_EUR = {
  crmSync: 49,
  whiteLabel: 299,
} as const;

export const L99_ADDON_MODULE_PRICES_EUR = {
  ...L99_LEGACY_ADDON_MODULE_PRICES_EUR,
  ...L99_PURCHASABLE_ADDON_MODULE_PRICES_EUR,
} as const;

export const L99_ROADMAP_ADDON_LABELS: Record<L99LegacyAddonKey, string> = {
  leadsEngine: "Leads Engine",
  marketIntelligence: "Market Intelligence",
  protocolAI: "Protocol AI",
  activeForceCalls: "Active Force Calls",
};

export function formatAddonPriceEur(amount: number): string {
  return `${amount} €/mes`;
}

export function parseSeatTier(value: string | null | undefined): SeatTier {
  const v = (value ?? "").toLowerCase().trim();
  if (v === "solo" || v === "team" || v === "office") return v;
  if (v === "solo-seat" || v === "smart-start" || v === "starter") return "solo";
  if (v === "team-seat" || v === "active-force" || v === "pro") return "team";
  if (v === "office-seat" || v === "market-vision" || v === "enterprise") return "office";
  return "team";
}

export function parseTopupPackageKey(value: string | null | undefined): TopupPackageKey | null {
  const v = (value ?? "").toLowerCase().trim();
  if ((TOPUP_PACKAGE_KEYS as readonly string[]).includes(v)) return v as TopupPackageKey;
  return null;
}

export function getSeatStripePriceId(tier: SeatTier): string {
  return process.env[SEAT_TIER_STRIPE_ENV[tier]] ?? "";
}

export function getTopupStripePriceId(key: TopupPackageKey): string {
  return process.env[TOPUP_PACKAGES[key].stripeEnvKey] ?? "";
}

export function getStarterPackStripePriceId(): string {
  return process.env[STARTER_PACK.stripeEnvKey] ?? "";
}

export function isStarterPackCheckoutAvailable(): boolean {
  return getStarterPackStripePriceId().length > 0;
}

export function getOwnerCockpitStripePriceId(opts?: {
  founderEligible?: boolean;
}): string {
  const owner = COCKPIT_PRODUCTS.owner;
  if (opts?.founderEligible && owner.founderStripeEnvKey) {
    const founderId = process.env[owner.founderStripeEnvKey] ?? "";
    if (founderId) return founderId;
  }
  const envKey = owner.stripeEnvKey;
  return envKey ? (process.env[envKey] ?? "") : "";
}

export function areSeatCheckoutPricesConfigured(): boolean {
  return SEAT_TIERS.every((tier) => getSeatStripePriceId(tier).length > 0);
}

export function areTopupCheckoutPricesConfigured(): boolean {
  return TOPUP_PACKAGE_KEYS.every((key) => getTopupStripePriceId(key).length > 0);
}

export function isCheckoutConfigured(): boolean {
  return areSeatCheckoutPricesConfigured() && areTopupCheckoutPricesConfigured();
}

/** Mesačný grant z seatov (bez cockpit grantu). */
export function monthlySeatGrantCredits(seatTier: SeatTier, seatCount: number): number {
  const perSeat = CREDIT_GRANTS[seatTier];
  return Math.max(0, seatCount) * perSeat;
}

/** Celkový mesačný grant (seaty + Owner Cockpit ak aktívny). */
export function monthlyAgencyGrantCredits(input: {
  seatTier: SeatTier;
  seatCount: number;
  ownerCockpitActive?: boolean;
}): number {
  let total = monthlySeatGrantCredits(input.seatTier, input.seatCount);
  if (input.ownerCockpitActive) {
    total += COCKPIT_PRODUCTS.owner.grantCredits;
  }
  return total;
}

export function cockpitLiteEligible(seatCount: number): boolean {
  return seatCount >= COCKPIT_LITE_MIN_SEATS;
}

export function formatSeatPriceLabel(tier: SeatTier): string {
  const { priceEur } = SEAT_TIER_CONFIG[tier];
  return `${priceEur} € / mesiac za makléra`;
}
