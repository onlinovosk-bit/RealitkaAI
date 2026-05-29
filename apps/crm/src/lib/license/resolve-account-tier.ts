type ProfileLike = {
  account_tier?: string | null;
  ui_role?: string | null;
  role?: string | null;
} | null;

/**
 * Canonical account-tier resolver.
 * ui_role from billing is authoritative for owner program mapping.
 */
export function resolveAccountTier(profile: ProfileLike): string {
  const uiRole = profile?.ui_role ?? "agent";
  if (uiRole === "owner_protocol" || profile?.role === "founder") {
    return "protocol_authority";
  }
  if (uiRole === "owner_vision") {
    return "market_vision";
  }
  return profile?.account_tier ?? "free";
}
