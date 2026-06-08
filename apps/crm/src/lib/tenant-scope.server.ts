import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export async function resolveSessionAgencyId(
  supabase: SupabaseClient,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { getAgencyIdForAuthUser } = await import("@/lib/auth");
  return getAgencyIdForAuthUser(supabase, user.id);
}
