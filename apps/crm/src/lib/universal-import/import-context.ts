import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { resolveProfileForAuthUser } from "@/lib/profiles/resolve-profile-for-auth";

export type ImportAuthContext = {
  supabase: SupabaseClient;
  userId: string;
  profileId: string;
  agencyId: string;
};

export async function resolveImportAuthContext(): Promise<ImportAuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { profile } = await resolveProfileForAuthUser(
    supabase,
    user.id,
    "id, agency_id",
    user.email,
  );

  if (!profile?.agency_id || !profile.id) return null;

  return {
    supabase,
    userId: user.id,
    profileId: profile.id,
    agencyId: profile.agency_id,
  };
}
