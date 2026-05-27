import type { SupabaseClient } from "@supabase/supabase-js";

export type ResolvedAuthProfile = {
  id: string;
  agency_id: string | null;
  auth_user_id?: string | null;
  full_name?: string | null;
  email?: string | null;
};

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
  const { data: profileRow } = await supabase
    .from("profiles")
    .select(select)
    .or(`auth_user_id.eq.${userId},id.eq.${userId}`)
    .maybeSingle();

  const profile = (profileRow as ResolvedAuthProfile | null) ?? null;
  return {
    profile,
    profileMissingAgency: !profile?.agency_id,
  };
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
  const { profile } = await resolveProfileForAuthUser(
    supabase,
    userId,
    "id, agency_id, auth_user_id, email",
  );

  if (profile?.auth_user_id === userId) {
    return profile;
  }

  if (profile && !profile.auth_user_id) {
    const { error } = await supabase
      .from("profiles")
      .update({ auth_user_id: userId })
      .eq("id", profile.id);

    if (!error) {
      return { ...profile, auth_user_id: userId };
    }
    return profile;
  }

  if (!profile && email) {
    const { data: byEmail } = await supabase
      .from("profiles")
      .select("id, agency_id, auth_user_id, email")
      .eq("email", email)
      .maybeSingle();

    const row = (byEmail as ResolvedAuthProfile | null) ?? null;
    if (row && !row.auth_user_id) {
      const { error } = await supabase
        .from("profiles")
        .update({ auth_user_id: userId })
        .eq("id", row.id);

      if (!error) {
        return { ...row, auth_user_id: userId };
      }
    }
    if (row) return row;
  }

  return profile;
}
