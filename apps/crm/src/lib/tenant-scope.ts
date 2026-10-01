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

/**
 * Fail-closed zhoda tenantov pre route handlery.
 *
 * Chýbajúca agentúra na volajúcom ALEBO na riadku znamená NIE, nikdy ÁNO.
 *
 * Nahrádza vzor `if (caller?.agency_id && row.agency_id !== caller.agency_id)`,
 * ktorý sa pri `agency_id = null` skratoval a podmienku preskočil. Profil bez
 * agentúry — aký vyrába pozvánka v `api/invite/route.ts` — tak prešiel bránou
 * do admin cesty, ktorá obchádza RLS.
 *
 * Rovnaká sémantika ako `filterRowsByAgency` vyššie: bez agentúry nula prístupu.
 */
export function sameAgency(
  callerAgencyId: string | null | undefined,
  rowAgencyId: string | null | undefined,
): boolean {
  if (!callerAgencyId || !rowAgencyId) return false;
  return callerAgencyId === rowAgencyId;
}
