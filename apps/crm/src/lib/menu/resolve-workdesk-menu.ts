import { resolveAccountTier } from "@/lib/license/resolve-account-tier";
import {
  getMenuVariant,
  VARIANT_THEMES,
  type MenuVariant,
} from "@/types/navigation";

export type WorkdeskMenuProfile = {
  ui_role?: string | null;
  account_tier?: string | null;
  role?: string | null;
  team_license_id?: string | null;
};

export type WorkdeskMenuContext = {
  variant: MenuVariant;
  planLabel: string;
  roleLabel: string;
  accountTier: string;
};

function getPlanDisplayName(variant: MenuVariant, accountTier: string): string {
  if (variant === "agent_solo" && accountTier === "starter") {
    return "Smart Start";
  }
  return VARIANT_THEMES[variant].planLabel;
}

/**
 * Single source for Workdesk sidebar: profiles.account_tier + ui_role + role → menu + labels.
 * Does not read Stripe — billing UI uses getCurrentPlanKey separately.
 */
export function resolveWorkdeskMenuContext(
  profile: WorkdeskMenuProfile | null,
  opts?: { appRole?: string; isFounderDemo?: boolean },
): WorkdeskMenuContext {
  const uiRole = profile?.ui_role ?? "agent";
  const accountTier = resolveAccountTier(profile);
  const appRole = opts?.appRole ?? profile?.role ?? undefined;
  const isInTeam = !!profile?.team_license_id;

  const variant = getMenuVariant(uiRole, isInTeam, appRole, accountTier);

  return {
    variant,
    planLabel: getPlanDisplayName(variant, accountTier),
    roleLabel: VARIANT_THEMES[variant].roleLabel,
    accountTier,
  };
}
