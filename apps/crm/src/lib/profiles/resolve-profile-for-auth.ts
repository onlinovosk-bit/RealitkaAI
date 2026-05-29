import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/admin";

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

/** Reality Smolko owner logins (prod + Google auth). */
export function isSmolkoOwnerEmail(email: string | null | undefined): boolean {
  const normalized = String(email ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized === "office@realitysmolko.sk" ||
    normalized === "rastislav.smolko@gmail.com" ||
    normalized.endsWith("@realitysmolko.sk")
  );
}

function isSmolkoEmail(email: string | null | undefined): boolean {
  return isSmolkoOwnerEmail(email);
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
  email?: string | null,
): Promise<{
  profile: ResolvedAuthProfile | null;
  profileMissingAgency: boolean;
}> {
  const { profile } = await findProfileForAuthUser(supabase, userId, email, select);
  const normalized = enforceSmolkoOwnerDefaults(profile);
  return {
    profile: normalized,
    profileMissingAgency: !normalized?.agency_id,
  };
}

async function findProfileForAuthUserViaServiceRole(
  userId: string,
  email: string | null | undefined,
  select: string,
): Promise<ProfileLookupResult> {
  const service = createServiceRoleClient();
  if (!service) {
    return { profile: null };
  }

  const byAuth = await service
    .from("profiles")
    .select(select)
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (byAuth.data) {
    return { profile: byAuth.data as ResolvedAuthProfile };
  }

  const byLegacyId = await service
    .from("profiles")
    .select(select)
    .eq("id", userId)
    .maybeSingle();
  if (byLegacyId.data) {
    return { profile: byLegacyId.data as ResolvedAuthProfile };
  }

  if (email) {
    const normalizedEmail = email.trim().toLowerCase();
    const byEmail = await service
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

async function persistAuthUserIdLink(
  profileId: string,
  userId: string,
  supabase: SupabaseClient,
): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({ auth_user_id: userId })
    .eq("id", profileId);

  if (!error) {
    return true;
  }

  const service = createServiceRoleClient();
  if (!service) {
    return false;
  }

  const { error: serviceError } = await service
    .from("profiles")
    .update({ auth_user_id: userId })
    .eq("id", profileId);

  return !serviceError;
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

  // RLS profiles_agency_select nevidí riadok bez auth_user_id / legacy id — service role lookup.
  return findProfileForAuthUserViaServiceRole(userId, email, select);
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
    const linkedOk = await persistAuthUserIdLink(profile.id, userId, supabase);
    const linked = enforceSmolkoOwnerDefaults(
      linkedOk ? { ...profile, auth_user_id: userId } : profile,
    );

    if (linkedOk && linked && (linked.role || linked.ui_role || linked.account_tier)) {
      const tierPayload = {
        role: linked.role,
        ui_role: linked.ui_role,
        account_tier: linked.account_tier,
        tier_updated_at: new Date().toISOString(),
      };
      const { error: tierError } = await supabase
        .from("profiles")
        .update(tierPayload)
        .eq("id", linked.id);

      if (tierError) {
        const service = createServiceRoleClient();
        if (service) {
          await service.from("profiles").update(tierPayload).eq("id", linked.id);
        }
      }
    }

    return linked;
  }

  return enforceSmolkoOwnerDefaults(profile);
}
