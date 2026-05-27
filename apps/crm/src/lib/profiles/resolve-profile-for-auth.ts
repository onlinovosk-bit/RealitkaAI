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
