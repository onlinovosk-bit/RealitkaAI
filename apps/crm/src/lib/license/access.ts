import { createClient } from "@/lib/supabase/server";
import { hasCapability, normalizeLicenseTier } from "./capability-registry";
import type { LicenseCapability, LicenseTierKey } from "./types";

export function resolveAccountTierFromProfile(
  profile: {
    account_tier?: string | null;
    ui_role?: string | null;
    role?: string | null;
  } | null,
): LicenseTierKey {
  const uiRole = profile?.ui_role ?? "agent";
  if (uiRole === "owner_protocol" || profile?.role === "founder") {
    return "protocol_authority";
  }
  return normalizeLicenseTier(profile?.account_tier);
}

export type CapabilityAccessResult = {
  allowed: boolean;
  reason: "unauthorized" | "no_profile" | "no_agency" | "forbidden" | "ok";
  tier: LicenseTierKey;
  userId?: string;
  profileId?: string;
  agencyId?: string;
};

export async function checkCapabilityAccess(
  capability: LicenseCapability,
): Promise<CapabilityAccessResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { allowed: false, reason: "unauthorized", tier: "free" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, agency_id, account_tier, ui_role, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile?.id) {
    return { allowed: false, reason: "no_profile", tier: "free", userId: user.id };
  }

  const tier = resolveAccountTierFromProfile(profile);

  if (!profile.agency_id) {
    return {
      allowed: false,
      reason: "no_agency",
      tier,
      userId: user.id,
      profileId: profile.id,
    };
  }

  if (!hasCapability(tier, capability)) {
    return {
      allowed: false,
      reason: "forbidden",
      tier,
      userId: user.id,
      profileId: profile.id,
      agencyId: profile.agency_id,
    };
  }

  return {
    allowed: true,
    reason: "ok",
    tier,
    userId: user.id,
    profileId: profile.id,
    agencyId: profile.agency_id,
  };
}
