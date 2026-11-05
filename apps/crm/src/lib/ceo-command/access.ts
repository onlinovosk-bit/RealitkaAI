export type CeoCommandProfile = {
  role?: string | null;
  ui_role?: string | null;
};

/**
 * Owner-only CEO Command — DB role only.
 * Do not treat billing ui_role (owner_vision/owner_protocol) as identity:
 * checkout/webhook can stamp those onto an agent payer without elevating role.
 */
export function isCeoCommandOwner(profile: CeoCommandProfile | null | undefined): boolean {
  if (!profile) return false;
  const role = (profile.role ?? "").trim().toLowerCase();
  return role === "owner" || role === "founder";
}
