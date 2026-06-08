import type { SupabaseClient } from "@supabase/supabase-js";
import { getAgencyIdForAuthUser } from "@/lib/auth";

/** Demo Realitka — orphan seed rows without tenant. */
export const DEMO_AGENCY_ID = "11111111-1111-1111-1111-111111111111";

export async function resolveSessionAgencyId(
  supabase: SupabaseClient,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return getAgencyIdForAuthUser(supabase, user.id);
}

export function filterRowsByAgency<T extends { agency_id?: string | null }>(
  rows: T[],
  agencyId: string | null,
): T[] {
  if (!agencyId) return [];
  return rows.filter((row) => row.agency_id === agencyId);
}
