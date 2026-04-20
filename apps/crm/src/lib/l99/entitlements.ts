import { createClient } from "@/lib/supabase/server";
import { ACCOUNT_TIERS, type AccountTier, type EnterpriseFeatureCheck } from "./types";

export async function checkEnterpriseAccess(): Promise<EnterpriseFeatureCheck> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { allowed: false, reason: "no_profile", currentTier: ACCOUNT_TIERS.FREE, isLocked: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_tier, tier_locked_at")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile) {
    return { allowed: false, reason: "no_profile", currentTier: ACCOUNT_TIERS.FREE, isLocked: false };
  }

  const tier = profile.account_tier as AccountTier;
  const isLocked = Boolean(profile.tier_locked_at);

  if (isLocked) {
    return { allowed: false, reason: "locked_downgrade", currentTier: tier, isLocked: true };
  }

  if (tier !== ACCOUNT_TIERS.ENTERPRISE) {
    return { allowed: false, reason: "wrong_tier", currentTier: tier, isLocked: false };
  }

  return { allowed: true, reason: "ok", currentTier: ACCOUNT_TIERS.ENTERPRISE, isLocked: false };
}

export async function requireEnterprise(): Promise<void> {
  const check = await checkEnterpriseAccess();
  if (!check.allowed) {
    throw new Error(
      check.reason === "locked_downgrade"
        ? "Enterprise dáta sú zamknuté. Obnoviť Enterprise plán pre obnovenie prístupu."
        : "Táto funkcia vyžaduje Enterprise plán."
    );
  }
}
