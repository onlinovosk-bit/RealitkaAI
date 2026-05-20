/**
 * Jednotný zdroj pravdy pre zobrazenie plánu (sidebar, nastavenia, billing).
 * Profil (account_tier / ui_role) má prednosť pred Stripe, ak je vyšší alebo manuálny.
 */

export type DisplayPlanKey =
  | "free"
  | "starter"
  | "active_force"
  | "market_vision"
  | "protocol_authority";

const TIER_RANK: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  active_force: 2,
  enterprise: 3,
  market_vision: 3,
  command: 4,
  protocol_authority: 4,
};

export const PLAN_LABELS: Record<DisplayPlanKey, string> = {
  free: "Free",
  starter: "Smart Start",
  active_force: "Active Force",
  market_vision: "Market Vision",
  protocol_authority: "Protocol Authority",
};

export const PLAN_LABELS_UPPER: Record<DisplayPlanKey, string> = {
  free: "FREE",
  starter: "SMART START",
  active_force: "ACTIVE FORCE",
  market_vision: "MARKET VISION",
  protocol_authority: "PROTOCOL AUTHORITY",
};

/** Normalizuje DB / Stripe kľúče na kanonický tier. */
export function normalizePlanKey(raw: string | null | undefined): string {
  const key = (raw ?? "free").trim().toLowerCase();
  if (key === "command") return "protocol_authority";
  if (key === "enterprise") return "market_vision";
  if (key === "pro") return "active_force";
  return key;
}

export function toDisplayPlanKey(raw: string | null | undefined): DisplayPlanKey {
  const key = normalizePlanKey(raw);
  if (key === "starter") return "starter";
  if (key === "active_force") return "active_force";
  if (key === "market_vision") return "market_vision";
  if (key === "protocol_authority") return "protocol_authority";
  return "free";
}

function tierRank(key: string): number {
  return TIER_RANK[normalizePlanKey(key)] ?? 0;
}

export type ProfilePlanInput = {
  account_tier?: string | null;
  ui_role?: string | null;
  protocol_active?: boolean | null;
};

/** Plán z profilu — zohľadní ui_role a protocol_active (manuálne / enterprise zmluvy). */
export function resolveProfilePlanKey(profile: ProfilePlanInput | null | undefined): DisplayPlanKey {
  if (!profile) return "free";

  if (profile.protocol_active || profile.ui_role === "owner_protocol") {
    return "protocol_authority";
  }
  if (profile.ui_role === "owner_vision") {
    return "market_vision";
  }

  return toDisplayPlanKey(profile.account_tier);
}

/** Vyberie vyšší plán medzi profilom a Stripe. */
export function resolveEffectivePlanKey(
  profile: ProfilePlanInput | null | undefined,
  stripePlanKey: string | null | undefined,
): DisplayPlanKey {
  const fromProfile = resolveProfilePlanKey(profile);
  const fromStripe = toDisplayPlanKey(stripePlanKey);

  return tierRank(fromProfile) >= tierRank(fromStripe) ? fromProfile : fromStripe;
}

export function getPlanLabel(
  planKey: string | null | undefined,
  opts?: { uppercase?: boolean },
): string {
  const display = toDisplayPlanKey(planKey);
  const map = opts?.uppercase ? PLAN_LABELS_UPPER : PLAN_LABELS;
  return map[display];
}

export function isProtocolAuthorityPlan(
  planKey: string | null | undefined,
  profile?: ProfilePlanInput | null,
): boolean {
  if (profile) {
    return resolveProfilePlanKey(profile) === "protocol_authority";
  }
  return toDisplayPlanKey(planKey) === "protocol_authority";
}
