import type { AccountTier } from "@/types/intelligence-hub";

export type ModuleStatus = "live" | "gated" | "unbuilt";
export type ModuleSurface = "hub" | "dashboard" | "menu";

export type ModuleKey =
  | "hub_planned_construction"
  | "hub_breaking_point"
  | "hub_neighborhood_change"
  | "hub_competition_map"
  | "hub_intel_brief"
  | "dashboard_ai_sales_intelligence"
  | "menu_hidden_market_hub"
  | "menu_competition_radar";

export type ModulePolicy = {
  key: ModuleKey;
  label: string;
  requiredTier: AccountTier;
  status: ModuleStatus;
  surface: ModuleSurface;
};

export const MODULE_REGISTRY: Record<ModuleKey, ModulePolicy> = {
  hub_planned_construction: {
    key: "hub_planned_construction",
    label: "Plánovaná stavba",
    requiredTier: "protocol_authority",
    status: "unbuilt",
    surface: "hub",
  },
  hub_breaking_point: {
    key: "hub_breaking_point",
    label: "Bod zlomu",
    requiredTier: "market_vision",
    status: "unbuilt",
    surface: "hub",
  },
  hub_neighborhood_change: {
    key: "hub_neighborhood_change",
    label: "Zmena v okolí",
    requiredTier: "protocol_authority",
    status: "unbuilt",
    surface: "hub",
  },
  hub_competition_map: {
    key: "hub_competition_map",
    label: "Competition Map",
    requiredTier: "protocol_authority",
    status: "live",
    surface: "hub",
  },
  hub_intel_brief: {
    key: "hub_intel_brief",
    label: "Intel Brief",
    requiredTier: "protocol_authority",
    status: "live",
    surface: "hub",
  },
  dashboard_ai_sales_intelligence: {
    key: "dashboard_ai_sales_intelligence",
    label: "AI Sales Intelligence",
    requiredTier: "protocol_authority",
    status: "gated",
    surface: "dashboard",
  },
  menu_hidden_market_hub: {
    key: "menu_hidden_market_hub",
    label: "Skryté príležitosti trhu",
    requiredTier: "protocol_authority",
    status: "gated",
    surface: "menu",
  },
  menu_competition_radar: {
    key: "menu_competition_radar",
    label: "Kde konkurencia spí",
    requiredTier: "protocol_authority",
    status: "live",
    surface: "menu",
  },
};

const TIER_RANK: Record<AccountTier, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  market_vision: 3,
  enterprise: 3,
  command: 4,
  protocol_authority: 4,
};

export const ALL_ACCOUNT_TIERS: AccountTier[] = [
  "free",
  "starter",
  "pro",
  "market_vision",
  "enterprise",
  "command",
  "protocol_authority",
];

export function normalizeModuleTier(rawTier?: string | null): AccountTier {
  const tier = (rawTier ?? "free").trim().toLowerCase();
  if (tier === "active_force" || tier === "active") return "pro";
  if (tier === "market" || tier === "scale") return "market_vision";
  if (tier === "protocol" || tier === "owner_protocol") return "protocol_authority";
  if (tier === "owner_vision") return "market_vision";
  if (tier in TIER_RANK) return tier as AccountTier;
  return "free";
}

function hasRequiredTier(userTier: AccountTier, requiredTier: AccountTier): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier];
}

export function canRenderModule(moduleKey: ModuleKey, rawUserTier?: string | null): boolean {
  const policy = MODULE_REGISTRY[moduleKey];
  const userTier = normalizeModuleTier(rawUserTier);

  if (policy.status === "unbuilt") {
    return false;
  }

  if (!hasRequiredTier(userTier, policy.requiredTier)) {
    return false;
  }

  return true;
}

