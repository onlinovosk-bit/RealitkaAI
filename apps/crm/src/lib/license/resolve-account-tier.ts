type ProfileLike = {
  account_tier?: string | null;
  ui_role?: string | null;
  role?: string | null;
} | null;

const MANUAL_PLAN_TO_TIER: Record<string, string> = {
  free: "free",
  starter: "starter",
  pro: "pro",
  active_force: "pro",
  scale: "market_vision",
  market_vision: "market_vision",
  enterprise: "market_vision",
  protocol_authority: "protocol_authority",
};

/**
 * Canonical account-tier resolver.
 * ui_role from billing is authoritative for owner program mapping.
 * agencies.manual_plan wins when set (manual invoice tenants e.g. Smolko).
 */
export function resolveAccountTier(
  profile: ProfileLike,
  agencyManualPlan?: string | null,
): string {
  const manualKey = agencyManualPlan?.trim().toLowerCase();
  if (manualKey && MANUAL_PLAN_TO_TIER[manualKey]) {
    return MANUAL_PLAN_TO_TIER[manualKey];
  }

  const uiRole = profile?.ui_role ?? "agent";
  if (uiRole === "owner_protocol" || profile?.role === "founder") {
    return "protocol_authority";
  }
  if (uiRole === "owner_vision") {
    return "market_vision";
  }
  return profile?.account_tier ?? "free";
}
