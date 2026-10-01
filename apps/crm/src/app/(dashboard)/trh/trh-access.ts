import { hasProgram, normalizeLicenseTier } from "@/lib/license/capability-registry";
import { resolveAccountTier } from "@/lib/license/resolve-account-tier";

export type TrhProfile = {
  account_tier?: string | null;
  ui_role?: string | null;
  role?: string | null;
};

export function resolveTrhAccountTier(
  profile: TrhProfile | null,
  agencyManualPlan?: string | null,
): string {
  return resolveAccountTier(profile, agencyManualPlan);
}

export function isTrhUnlocked(accountTier: string): boolean {
  return hasProgram(normalizeLicenseTier(accountTier), "monopol");
}
