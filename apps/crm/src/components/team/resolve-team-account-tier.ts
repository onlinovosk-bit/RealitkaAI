import { resolveAccountTier } from "@/lib/license/resolve-account-tier";

type ProfileLike = {
  account_tier?: string | null;
  ui_role?: string | null;
  role?: string | null;
} | null;

/** Team UI tier — delegates to canonical license resolver. */
export function resolveTeamAccountTier(
  profile: ProfileLike,
  agencyManualPlan?: string | null,
): string {
  return resolveAccountTier(profile, agencyManualPlan);
}
