import type { SupabaseClient } from "@supabase/supabase-js";
import {
  collectHeartbeatMetrics,
  evaluateHeartbeatSignals,
  type HeartbeatSignal,
} from "@/lib/infra/platform-heartbeat";
import { resolveProfileForAuthUser } from "@/lib/profiles/resolve-profile-for-auth";
import { resolveTenantSupabase } from "@/lib/supabase/resolve-client";
import { createAdminClient } from "@/lib/supabase/server";

export type TenantHealthSnapshot = {
  userId: string | null;
  profileAgencyId: string | null;
  counts: {
    properties: number;
    leads: number;
    newStatusLeads: number;
    tasks: number;
    activities: number;
    leadPropertyMatches: number;
  };
  heartbeat?: {
    ok: boolean;
    checkedAt: string;
    signals: HeartbeatSignal[];
  };
};

async function safeCount(
  supabase: SupabaseClient,
  table: string,
  filters?: { column: string; value: string }[],
): Promise<number> {
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  for (const f of filters ?? []) {
    query = query.eq(f.column, f.value);
  }
  const { count, error } = await query;

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
        newStatusLeads: 0,
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
    const { profile } = await resolveProfileForAuthUser(
      supabase,
      user.id,
      "agency_id",
      user.email,
    );
    profileAgencyId = profile?.agency_id ?? null;
  }

  const [properties, leads, newStatusLeads, tasks, activities, leadPropertyMatches] =
    await Promise.all([
      safeCount(supabase, "properties"),
      safeCount(supabase, "leads"),
      safeCount(supabase, "leads", [{ column: "status", value: "Nový" }]),
      safeCount(supabase, "tasks"),
      safeCount(supabase, "activities"),
      safeCount(supabase, "lead_property_matches"),
    ]);

  let heartbeat: TenantHealthSnapshot["heartbeat"];
  if (profileAgencyId) {
    try {
      const admin = createAdminClient();
      const metrics = await collectHeartbeatMetrics(admin, profileAgencyId);
      const signals = evaluateHeartbeatSignals(metrics);
      heartbeat = {
        ok: signals.length === 0,
        checkedAt: new Date().toISOString(),
        signals,
      };
    } catch {
      heartbeat = undefined;
    }
  }

  return {
    userId: user?.id ?? null,
    profileAgencyId,
    counts: {
      properties,
      leads,
      newStatusLeads,
      tasks,
      activities,
      leadPropertyMatches,
    },
    heartbeat,
  };
}
