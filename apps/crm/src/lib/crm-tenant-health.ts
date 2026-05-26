import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveTenantSupabase } from "@/lib/supabase/resolve-client";

export type TenantHealthSnapshot = {
  userId: string | null;
  profileAgencyId: string | null;
  counts: {
    properties: number;
    leads: number;
    tasks: number;
    activities: number;
    leadPropertyMatches: number;
  };
};

async function safeCount(
  supabase: SupabaseClient,
  table: string,
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error(`[tenant-health] count ${table}:`, error.message);
    return 0;
  }
  return count ?? 0;
}

/** Diagnostika RLS + session — pre smoke a podporu (Smolko). */
export async function getTenantHealthSnapshot(
  scopedSupabase?: SupabaseClient | null,
): Promise<TenantHealthSnapshot> {
  const supabase = await resolveTenantSupabase(scopedSupabase);
  if (!supabase) {
    return {
      userId: null,
      profileAgencyId: null,
      counts: {
        properties: 0,
        leads: 0,
        tasks: 0,
        activities: 0,
        leadPropertyMatches: 0,
      },
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profileAgencyId: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id")
      .or(`auth_user_id.eq.${user.id},id.eq.${user.id}`)
      .maybeSingle();
    profileAgencyId = profile?.agency_id ?? null;
  }

  const [properties, leads, tasks, activities, leadPropertyMatches] =
    await Promise.all([
      safeCount(supabase, "properties"),
      safeCount(supabase, "leads"),
      safeCount(supabase, "tasks"),
      safeCount(supabase, "activities"),
      safeCount(supabase, "lead_property_matches"),
    ]);

  return {
    userId: user?.id ?? null,
    profileAgencyId,
    counts: {
      properties,
      leads,
      tasks,
      activities,
      leadPropertyMatches,
    },
  };
}
