import { resolveAccountTier } from "@/lib/license/resolve-account-tier";

export type EntitlementProfile = {
  role?: string | null;
  ui_role?: string | null;
  account_tier?: string | null;
};

const OWNER_APP_ROLES = new Set(["owner", "manager", "admin"]);

/**
 * Sync ui_role + account_tier from canonical DB fields (role, account_tier, ui_role).
 * No email-specific overrides — works for every owner/agency account.
 */
export function normalizeProfileEntitlements<T extends EntitlementProfile>(
  profile: T | null,
): T | null {
  if (!profile) return profile;

  const role = (profile.role ?? "agent").toLowerCase();
  const tier = resolveAccountTier(profile);
  let ui_role = profile.ui_role ?? "agent";

  if (OWNER_APP_ROLES.has(role)) {
    if (tier === "protocol_authority") {
      ui_role = "owner_protocol";
    } else if (tier === "market_vision" || tier === "enterprise") {
      ui_role = "owner_vision";
    }
  } else if (tier === "protocol_authority" && ui_role === "agent") {
    ui_role = "owner_protocol";
  } else if (
    (tier === "market_vision" || tier === "enterprise") &&
    ui_role === "agent"
  ) {
    ui_role = "owner_vision";
  }

  return {
    ...profile,
    role: OWNER_APP_ROLES.has(role) ? role : profile.role,
    ui_role,
    account_tier: tier,
  };
}

export function entitlementRank(profile: EntitlementProfile | null): number {
  if (!profile) return 0;
  const tier = resolveAccountTier(profile);
  const role = (profile.role ?? "agent").toLowerCase();
  const tierRank: Record<string, number> = {
    free: 0,
    starter: 1,
    pro: 2,
    active: 2,
    market_vision: 3,
    enterprise: 3,
    protocol_authority: 4,
  };
  let rank = tierRank[tier] ?? 0;
  if (OWNER_APP_ROLES.has(role)) rank += 10;
  if (profile.ui_role === "owner_vision") rank += 1;
  if (profile.ui_role === "owner_protocol") rank += 2;
  return rank;
}
