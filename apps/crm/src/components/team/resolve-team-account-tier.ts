type ProfileLike = {
  account_tier?: string | null;
  ui_role?: string | null;
  role?: string | null;
} | null;

/** Aligns with revolis-ai tier resolution — ui_role from billing webhook is authoritative. */
export function resolveTeamAccountTier(profile: ProfileLike): string {
  const uiRole = profile?.ui_role ?? "agent";
  if (uiRole === "owner_protocol" || profile?.role === "founder") {
    return "protocol_authority";
  }
  return profile?.account_tier ?? "free";
}
