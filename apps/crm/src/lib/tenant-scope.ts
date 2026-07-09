import type { SupabaseClient } from "@supabase/supabase-js";

/** Revolis Demo tenant used for internal demo-safe operations. */
export const DEMO_AGENCY_ID = "b101361c-e250-4c43-b099-52c4febeb450";

export async function resolveSessionAgencyId(
  supabase: SupabaseClient,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { resolveProfileForAuthUser } = await import(
    "@/lib/profiles/resolve-profile-for-auth"
  );
  const { profile } = await resolveProfileForAuthUser(supabase, user.id, "agency_id");
  return profile?.agency_id ?? null;
}

export function filterRowsByAgency<T extends { agency_id?: string | null }>(
  rows: T[],
  agencyId: string | null,
): T[] {
  if (!agencyId) return [];
  return rows.filter((row) => row.agency_id === agencyId);
}
