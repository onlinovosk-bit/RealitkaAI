export type CeoCommandProfile = {
  role?: string | null;
  ui_role?: string | null;
};

/** Owner-only CEO Command — ui_role owner_vision/owner_protocol alebo role owner. */
export function isCeoCommandOwner(profile: CeoCommandProfile | null | undefined): boolean {
  if (!profile) return false;
  const uiRole = (profile.ui_role ?? "").trim();
  const role = (profile.role ?? "").trim().toLowerCase();
  return (
    role === "owner" ||
    uiRole === "owner_vision" ||
    uiRole === "owner_protocol"
  );
}
