import type { SupabaseClient } from "@supabase/supabase-js";

export type ResolvedAuthProfile = {
  id: string;
  agency_id: string | null;
  auth_user_id?: string | null;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
  ui_role?: string | null;
  account_tier?: string | null;
};

type ProfileLookupResult = {
  profile: ResolvedAuthProfile | null;
};

function isSmolkoEmail(email: string | null | undefined): boolean {
  const normalized = String(email ?? "").trim().toLowerCase();
  return normalized === "office@realitysmolko.sk" || normalized.endsWith("@realitysmolko.sk");
}

function enforceSmolkoOwnerDefaults(
  profile: ResolvedAuthProfile | null,
): ResolvedAuthProfile | null {
  if (!profile) return profile;
  if (!isSmolkoEmail(profile.email)) return profile;
  return {
    ...profile,
    role: "owner",
    ui_role: "owner_vision",
    account_tier: profile.account_tier === "protocol_authority" ? "protocol_authority" : "market_vision",
  };
}

/**
 * Profil pre prihláseného auth usera — zhodné s `profile_agencies_for_auth()`:
 * `auth_user_id` alebo legacy `profiles.id`.
 */
export async function resolveProfileForAuthUser(
  supabase: SupabaseClient,
  userId: string,
  select = "id, agency_id, auth_user_id",
): Promise<{
  profile: ResolvedAuthProfile | null;
  profileMissingAgency: boolean;
}> {
  const { profile } = await findProfileForAuthUser(supabase, userId, undefined, select);
  return {
    profile,
    profileMissingAgency: !profile?.agency_id,
  };
}

async function findProfileForAuthUser(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null,
  select = "id, agency_id, auth_user_id",
): Promise<ProfileLookupResult> {
  const byAuth = await supabase
    .from("profiles")
    .select(select)
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (byAuth.data) {
    return { profile: byAuth.data as ResolvedAuthProfile };
  }

  const byLegacyId = await supabase
    .from("profiles")
    .select(select)
    .eq("id", userId)
    .maybeSingle();
  if (byLegacyId.data) {
    return { profile: byLegacyId.data as ResolvedAuthProfile };
  }

  if (email) {
    const normalizedEmail = email.trim().toLowerCase();
    const byEmail = await supabase
      .from("profiles")
      .select(select)
      .ilike("email", normalizedEmail)
      .maybeSingle();
    if (byEmail.data) {
      return { profile: byEmail.data as ResolvedAuthProfile };
    }
  }

  return { profile: null };
}

/**
 * Prepojí `profiles.auth_user_id` na aktuálne prihlásenie — RLS `profile_agencies_for_auth()`
 * inak nevráti agency_id (profil existuje len pod e-mailom / legacy id).
 */
export async function linkProfileToAuthUser(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null,
): Promise<ResolvedAuthProfile | null> {
  const { profile } = await findProfileForAuthUser(
    supabase,
    userId,
    email,
    "id, agency_id, auth_user_id, email, role, ui_role, account_tier",
  );

  if (profile?.auth_user_id === userId) {
    const normalized = enforceSmolkoOwnerDefaults(profile);
    if (
      normalized &&
      (normalized.role !== profile.role ||
        normalized.ui_role !== profile.ui_role ||
        normalized.account_tier !== profile.account_tier)
    ) {
      await supabase
        .from("profiles")
        .update({
          role: normalized.role,
          ui_role: normalized.ui_role,
          account_tier: normalized.account_tier,
          tier_updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);
    }
    return normalized;
  }

  if (profile && !profile.auth_user_id) {
    const { error } = await supabase
      .from("profiles")
      .update({ auth_user_id: userId })
      .eq("id", profile.id);

    if (!error) {
      const linked = enforceSmolkoOwnerDefaults({ ...profile, auth_user_id: userId });
      if (linked && (linked.role || linked.ui_role || linked.account_tier)) {
        await supabase
          .from("profiles")
          .update({
            role: linked.role,
            ui_role: linked.ui_role,
            account_tier: linked.account_tier,
            tier_updated_at: new Date().toISOString(),
          })
          .eq("id", linked.id);
      }
      return linked;
    }
    return enforceSmolkoOwnerDefaults(profile);
  }

  return enforceSmolkoOwnerDefaults(profile);
}
