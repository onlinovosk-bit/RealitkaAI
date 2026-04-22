"use server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/permissions";
import type { AccountTier, UiRole } from "@/types/intelligence-hub";

type LicensingPlan = "market_vision" | "protocol_authority";

type PlanConfig = {
  accountTier:      AccountTier;
  uiRole:           UiRole;
  activeForceSlots: number;
  protocolActive:   boolean;
};

const PLAN_CONFIGS: Record<LicensingPlan, PlanConfig> = {
  market_vision: {
    accountTier:      "market_vision",
    uiRole:           "owner_vision",
    activeForceSlots: 1,
    protocolActive:   false,
  },
  protocol_authority: {
    accountTier:      "protocol_authority",
    uiRole:           "owner_protocol",
    activeForceSlots: 4,
    protocolActive:   true,
  },
};

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function upgradeTeamLicense(
  agencyId: string,
  plan: LicensingPlan
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireRole(["founder", "owner"]);
    const config  = PLAN_CONFIGS[plan];
    const service = getServiceClient();

    // 1. Aktualizuj owner profil
    const { error: profileError } = await service
      .from("profiles")
      .update({
        account_tier:    config.accountTier,
        ui_role:         config.uiRole,
        protocol_active: config.protocolActive,
        command_slots:   config.activeForceSlots,
        tier_updated_at: new Date().toISOString(),
      })
      .eq("agency_id", agencyId)
      .eq("role", "owner");

    if (profileError) throw profileError;

    // 2. Upsert team license záznamu
    const { error: licenseError } = await service
      .from("team_licenses")
      .upsert(
        {
          agency_id:          agencyId,
          license_type:       plan,
          active_force_slots: config.activeForceSlots,
          used_slots:         0,
          is_active:          true,
          updated_at:         new Date().toISOString(),
        },
        { onConflict: "agency_id" }
      );

    if (licenseError) throw licenseError;
    return { ok: true };
  } catch (err) {
    console.error("[licensing] upgradeTeamLicense error:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Neznáma chyba" };
  }
}

export async function assignActiveForceSlot(
  agencyId: string,
  agentProfileId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireRole(["founder", "owner"]);
    const service = getServiceClient();

    const { data: license } = await service
      .from("team_licenses")
      .select("active_force_slots, used_slots")
      .eq("agency_id", agencyId)
      .eq("is_active", true)
      .single();

    if (!license) return { ok: false, error: "Tímová licencia nenájdená." };
    if (license.used_slots >= license.active_force_slots) {
      return { ok: false, error: "Všetky Active Force sloty sú obsadené." };
    }

    const { error: agentError } = await service
      .from("profiles")
      .update({
        account_tier:    "pro",
        ui_role:         "agent",
        team_license_id: agencyId,
        tier_updated_at: new Date().toISOString(),
      })
      .eq("id", agentProfileId);

    if (agentError) throw agentError;

    const { error: slotError } = await service
      .from("team_licenses")
      .update({ used_slots: license.used_slots + 1 })
      .eq("agency_id", agencyId);

    if (slotError) throw slotError;
    return { ok: true };
  } catch (err) {
    console.error("[licensing] assignActiveForceSlot error:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Neznáma chyba" };
  }
}

export async function getCurrentUiPermissions() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
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
      (profile.ui_role ?? "agent") as UiRole
    );
  } catch {
    return null;
  }
}
