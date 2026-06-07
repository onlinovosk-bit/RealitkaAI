import type {
  CapabilityDefinition,
  LicenseCapability,
  LicenseProgram,
  LicenseProgramId,
  LicenseTierKey,
} from "./types";

export type { LicenseCapability } from "./types";

/** Rank ladder — single source for tier comparisons */
export const TIER_RANK: Record<LicenseTierKey, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  enterprise: 3,
  market_vision: 3,
  command: 4,
  protocol_authority: 4,
};

export const LICENSE_PROGRAMS: Record<LicenseProgramId, LicenseProgram> = {
  smart: {
    id: "smart",
    psychology: "kontrola",
    feeling: "Konečne mám poriadok",
    displayName: "Smart",
    billingLabel: "Smart Start",
    minTier: "starter",
  },
  radar: {
    id: "radar",
    psychology: "príležitosti",
    feeling: "AI mi ukazuje príležitosti",
    displayName: "Radar",
    billingLabel: "Active Force",
    minTier: "pro",
  },
  guardian: {
    id: "guardian",
    psychology: "ochrana",
    feeling: "AI mi chráni peniaze",
    displayName: "Guardian",
    billingLabel: "Market Vision",
    minTier: "market_vision",
  },
  monopol: {
    id: "monopol",
    psychology: "dominancia",
    feeling: "AI mi pomáha ovládať trh",
    displayName: "Monopol",
    billingLabel: "Reality Monopol",
    minTier: "protocol_authority",
  },
};

export const CAPABILITY_REGISTRY: Record<LicenseCapability, CapabilityDefinition> = {
  canViewBasicDashboard: {
    capability: "canViewBasicDashboard",
    label: "Základný dashboard",
    teaser: "Prehľad dňa a priority na jednom mieste.",
    requiredProgram: "smart",
    upgradeProgram: "smart",
    upgradeCta: "Aktivovať Smart Start",
    revenueTrigger: "locked_feature_view",
  },
  canManageLeads: {
    capability: "canManageLeads",
    label: "Správa leadov",
    teaser: "Leady, kontakty a história — bez chaosu.",
    requiredProgram: "smart",
    upgradeProgram: "smart",
    upgradeCta: "Aktivovať Smart Start",
    revenueTrigger: "locked_feature_view",
  },
  canUseAiTasks: {
    capability: "canUseAiTasks",
    label: "AI úlohy",
    teaser: "Denné AI kroky, ktoré posúvajú deal dopredu.",
    requiredProgram: "smart",
    upgradeProgram: "smart",
    upgradeCta: "Aktivovať Smart Start",
    revenueTrigger: "locked_feature_view",
  },
  canViewForecast: {
    capability: "canViewForecast",
    label: "Forecast & pipeline peniaze",
    teaser: "Kde dnes inkasuješ — a kde uniká provízia.",
    requiredProgram: "radar",
    upgradeProgram: "radar",
    upgradeCta: "Aktivovať Radar — od €99/mes",
    revenueTrigger: "forecast_attempt",
  },
  canUseMarketIntel: {
    capability: "canUseMarketIntel",
    label: "Market Intelligence",
    teaser: "Presné ulice, dopytový pretlak a čakajúci kupci.",
    requiredProgram: "guardian",
    upgradeProgram: "guardian",
    upgradeCta: "Aktivovať Market Vision",
    revenueTrigger: "market_intel_attempt",
  },
  canViewDemandHeatmap: {
    capability: "canViewDemandHeatmap",
    label: "Radar dopytu a ponuky",
    teaser: "Heatmapa dopytu vs. ponuky — kde je diera na trhu.",
    requiredProgram: "guardian",
    upgradeProgram: "guardian",
    upgradeCta: "Aktivovať Market Vision",
    revenueTrigger: "market_intel_attempt",
  },
  canAccessTeamPressure: {
    capability: "canAccessTeamPressure",
    label: "Owner Pressure View",
    teaser: "Tlak na tím podľa revenue, nie dojmov.",
    requiredProgram: "guardian",
    upgradeProgram: "guardian",
    upgradeCta: "Aktivovať Market Vision",
    revenueTrigger: "locked_feature_view",
  },
  canUseRescueAutomation: {
    capability: "canUseRescueAutomation",
    label: "Rescue — záchrana dealu",
    teaser: "AI resuscitácia pred stratou provízie.",
    requiredProgram: "guardian",
    upgradeProgram: "guardian",
    upgradeCta: "Aktivovať Guardian",
    revenueTrigger: "guardian_teaser_open",
  },
  canViewClosingWindow: {
    capability: "canViewClosingWindow",
    label: "Closing Window",
    teaser: "Kedy klient podpíše — a kedy volať.",
    requiredProgram: "radar",
    upgradeProgram: "radar",
    upgradeCta: "Aktivovať Radar",
    revenueTrigger: "forecast_attempt",
  },
  canUseCompetitionRadar: {
    capability: "canUseCompetitionRadar",
    label: "Competition Radar",
    teaser: "Kde konkurencia spí — a kde zoberieš trh.",
    requiredProgram: "monopol",
    upgradeProgram: "monopol",
    upgradeCta: "Aktivovať Reality Monopol",
    revenueTrigger: "locked_feature_view",
  },
  canAccessGuardianAlerts: {
    capability: "canAccessGuardianAlerts",
    label: "Guardian revenue alerts",
    teaser: "Upozornenia na riziko straty provízie v reálnom čase.",
    requiredProgram: "guardian",
    upgradeProgram: "guardian",
    upgradeCta: "Aktivovať Guardian",
    revenueTrigger: "guardian_teaser_open",
  },
  canUseMonopolDominance: {
    capability: "canUseMonopolDominance",
    label: "Dominancia trhu",
    teaser: "AI signály na ovládnutie lokality a pipeline.",
    requiredProgram: "monopol",
    upgradeProgram: "monopol",
    upgradeCta: "Aktivovať Reality Monopol",
    revenueTrigger: "locked_feature_view",
  },
};

const PROGRAM_MIN_RANK: Record<LicenseProgramId, number> = {
  smart: TIER_RANK.starter,
  radar: TIER_RANK.pro,
  guardian: TIER_RANK.market_vision,
  monopol: TIER_RANK.protocol_authority,
};

/** Normalize Stripe / legacy tier strings */
export function normalizeLicenseTier(raw: string | null | undefined): LicenseTierKey {
  const tier = (raw ?? "free").trim().toLowerCase();
  if (tier in TIER_RANK) return tier as LicenseTierKey;
  if (tier === "scale" || tier === "active_force" || tier === "active") return "pro";
  return "free";
}

export function getTierRank(tier: LicenseTierKey): number {
  return TIER_RANK[tier] ?? 0;
}

export function hasProgram(tier: LicenseTierKey, program: LicenseProgramId): boolean {
  return getTierRank(tier) >= PROGRAM_MIN_RANK[program];
}

export function hasCapability(tier: LicenseTierKey, capability: LicenseCapability): boolean {
  const def = CAPABILITY_REGISTRY[capability];
  return hasProgram(tier, def.requiredProgram);
}

export function resolveCapabilities(tierInput: string | null | undefined): Record<LicenseCapability, boolean> {
  const tier = normalizeLicenseTier(tierInput);
  return Object.fromEntries(
    (Object.keys(CAPABILITY_REGISTRY) as LicenseCapability[]).map((cap) => [
      cap,
      hasCapability(tier, cap),
    ]),
  ) as Record<LicenseCapability, boolean>;
}

export function getCapabilityDefinition(capability: LicenseCapability): CapabilityDefinition {
  return CAPABILITY_REGISTRY[capability];
}

export function getProgramForTier(tierInput: string | null | undefined): LicenseProgramId {
  const tier = normalizeLicenseTier(tierInput);
  const rank = getTierRank(tier);
  if (rank >= PROGRAM_MIN_RANK.monopol) return "monopol";
  if (rank >= PROGRAM_MIN_RANK.guardian) return "guardian";
  if (rank >= PROGRAM_MIN_RANK.radar) return "radar";
  if (rank >= PROGRAM_MIN_RANK.smart) return "smart";
  return "smart";
}

export const DEFAULT_MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
  "https://tiles.openfreemap.org/styles/liberty";
