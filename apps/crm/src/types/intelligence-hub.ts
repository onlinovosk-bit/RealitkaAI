// ─── Tier systém ─────────────────────────────────────────────────────────────

export type AccountTier =
  | "free"
  | "starter"             // Smart Start
  | "pro"                 // Active Force
  | "enterprise"          // Market Vision (CRM alias)
  | "market_vision"       // Market Vision (interný)
  | "protocol_authority"; // Protocol Authority

export type UiRole =
  | "agent"           // Smart Start, Active Force, tímoví makléri
  | "owner_vision"    // Market Vision owner
  | "owner_protocol"; // Protocol Authority owner

// HubTier zachovaný pre spätnú kompatibilitu
export type HubTier = AccountTier;

// Mapovanie tier → landing názov
export const TIER_DISPLAY_NAMES: Record<AccountTier, string> = {
  free:                "Free",
  starter:             "Smart Start",
  pro:                 "Active Force",
  enterprise:          "Market Vision",
  market_vision:       "Market Vision",
  protocol_authority:  "Protocol Authority",
};

// Mapovanie tier → cena €/mes
export const TIER_PRICES: Record<AccountTier, number | null> = {
  free:                0,
  starter:             49,
  pro:                 99,
  enterprise:          199,
  market_vision:       199,
  protocol_authority:  449,
};

// Tímové licencie
export type TeamLicense = {
  id:                string;
  licenseType:       "market_vision" | "protocol_authority";
  ownerProfileId:    string;
  activeForceSlots:  number;
  usedSlots:         number;
  isActive:          boolean;
};

// UI permissions
export type UiPermissions = {
  canSeeCompetitionHeatmap: boolean;
  canSeeGhostResurrection:  boolean;
  canSeeL99Hub:             boolean;
  canSeeNeuralPulse:        boolean;
  canManageTeam:            boolean;
  canSeeIntelSources:       boolean;
  activeForceFeatures:      boolean;
};

export function getUiPermissions(
  tier: AccountTier,
  uiRole: UiRole
): UiPermissions {
  const isOwnerProtocol = uiRole === "owner_protocol";
  const isAnyOwner      = uiRole === "owner_vision" || uiRole === "owner_protocol";
  const isActiveForce   =
    tier === "pro" ||
    tier === "market_vision" ||
    tier === "enterprise" ||
    tier === "protocol_authority";

  return {
    canSeeCompetitionHeatmap: isOwnerProtocol,
    canSeeGhostResurrection:  isAnyOwner,
    canSeeL99Hub:             isAnyOwner,
    canSeeNeuralPulse:        isOwnerProtocol,
    canManageTeam:            isAnyOwner,
    canSeeIntelSources:       isActiveForce || isAnyOwner,
    activeForceFeatures:      isActiveForce,
  };
}

// Ghost Resurrection session
export type GhostSessionData = {
  sessionId:  string;
  city:       string;
  district:   string;
  leadCount:  number;
  lastSeenAt: string;
};

// Competition radar
export type CompetitionSector = {
  name:            string;
  district:        string;
  competitorCount: number;
  heatScore:       number;
  isDemo:          boolean;
  trend:           "rising" | "falling" | "stable";
};

// Neural pulse particle
export type Particle = {
  x:    number;
  y:    number;
  vx:   number;
  vy:   number;
  size: number;
};

// Toast
export type ToastMessage = {
  id:      string;
  type:    "info" | "success" | "warning" | "upgrade";
  message: string;
};

// TIER_LABELS alias pre spätnú kompatibilitu s l99-hub page
export const TIER_LABELS = TIER_DISPLAY_NAMES;
