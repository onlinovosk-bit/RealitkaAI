"use server";

import { createClient } from "@/lib/supabase/server";
import type { AccountTier, UiRole } from "@/types/intelligence-hub";

type LicensingPlan = "market_vision" | "protocol_authority";

/**
 * Former free entitlement writer (service_role update of account_tier / ui_role
 * for an arbitrary client-supplied agencyId). Disabled: any "use server" export
 * is a callable action endpoint — an authenticated owner could grant
 * protocol_authority to their own (or another) agency without Stripe.
 * Paid Market Vision / Protocol Authority tiers come only from Stripe billing
 * webhooks (same posture as upgradeToL99 in l99-licensing.ts).
 */
export async function upgradeTeamLicense(
  _agencyId: string,
  _plan: LicensingPlan,
): Promise<{ ok: boolean; error?: string }> {
  return {
    ok: false,
    error:
      "upgradeTeamLicense is disabled; entitlements come from Stripe/billing only.",
  };
}

/**
 * Former free slot/tier writer for arbitrary agencyId + agentProfileId via
 * service_role. Disabled for the same reason as upgradeTeamLicense.
 */
export async function assignActiveForceSlot(
  _agencyId: string,
  _agentProfileId: string,
): Promise<{ ok: boolean; error?: string }> {
  return {
    ok: false,
    error:
      "assignActiveForceSlot is disabled; entitlements come from Stripe/billing only.",
  };
}

export async function getCurrentUiPermissions() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("account_tier, ui_role, role, protocol_active")
      .eq("auth_user_id", user.id)
      .single();

    if (!profile) return null;

    const { getUiPermissions } = await import("@/types/intelligence-hub");

    if (profile.role === "founder") {
      return getUiPermissions("protocol_authority", "owner_protocol");
    }

    return getUiPermissions(
      (profile.account_tier ?? "free") as AccountTier,
      (profile.ui_role ?? "agent") as UiRole,
    );
  } catch {
    return null;
  }
}
