import { supabaseClient, getSupabaseClient } from "@/lib/supabase/client";
import { resolveTenantSupabase } from "@/lib/supabase/resolve-client";
import { listLeads, LEADS_LIST_MAX } from "@/lib/leads-store";
import { generateRecommendationsForLead, type GeneratedRecommendation, type SimpleMatch } from "@/lib/recommendations-engine";

/**
 * listLeads hard-caps at LEADS_LIST_MAX per page. A full page is not proof the
 * tenant inventory ends there — clear-all then rebuild from that page would
 * permanently drop ai_recommendations for off-page leads. Empty reads (prod
 * soft-fail on DB error / missing agency) would wipe the entire table.
 */
function leadInventoryUnsafeForGlobalClear(leadsCount: number): boolean {
  return leadsCount === 0 || leadsCount >= LEADS_LIST_MAX;
}

type MatchRead =
  | { ok: true; matches: SimpleMatch[] }
  | { ok: false };

export type PersistedRecommendation = {
  id: string;
  leadId: string | null;
  propertyId: string | null;
  recommendationType: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  modelVersion: string;
  createdAt?: string;
};

const globalRecommendationsStore = globalThis as typeof globalThis & {
  __realitkaDemoRecommendations?: PersistedRecommendation[];
};

function getDemoRecommendationsStore() {
  if (!globalRecommendationsStore.__realitkaDemoRecommendations) {
    globalRecommendationsStore.__realitkaDemoRecommendations = [];
  }

  return globalRecommendationsStore.__realitkaDemoRecommendations;
}

/**
 * Match inventory for recommendation rebuild. Soft-failing to [] on DB error
 * used to look like "no matches" and triggered clear+rebuild — wiping every
 * property_match recommendation. Fail closed instead: caller must skip wipe.
 */
async function listPersistedMatches(
  scoped?: import("@supabase/supabase-js").SupabaseClient | null,
): Promise<MatchRead> {
  const supabase = await resolveTenantSupabase(scoped);

  if (!supabase) {
    return { ok: true, matches: [] };
  }

  const { data, error } = await supabase
    .from("lead_property_matches")
    .select("*")
    .order("score", { ascending: false });

  if (error) {
    console.error("listPersistedMatches error:", error.message);
    return { ok: false };
  }
  if (!data) {
    console.error("listPersistedMatches error: empty response");
    return { ok: false };
  }

  return {
    ok: true,
    matches: data.map((item: any) => ({
      leadId: item.lead_id,
      propertyId: item.property_id,
      matchScore: Number(item.score ?? 0),
      reasons: Array.isArray(item.reasons) ? item.reasons : [],
    })),
  };
}

export async function listRecommendations(
  scopedSupabase?: import("@supabase/supabase-js").SupabaseClient | null,
): Promise<PersistedRecommendation[]> {
  const supabase = await resolveTenantSupabase(scopedSupabase);

  if (!supabase) {
    return [...getDemoRecommendationsStore()].sort((a, b) => {
      const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return right - left;
    });
  }

  const { data, error } = await supabase
    .from("ai_recommendations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("listRecommendations error:", error?.message);
    return [];
  }

  return data.map((item: any) => ({
    id: item.id,
    leadId: item.lead_id ?? null,
    propertyId: null,
    recommendationType: item.recommendation_type,
    title: item.title,
    description: item.description ?? "",
    priority: item.priority ?? "medium",
    status: item.status ?? "active",
    modelVersion: item.model_version ?? "v1",
    createdAt: item.created_at,
  }));
}

async function clearRecommendations(
  scoped?: import("@supabase/supabase-js").SupabaseClient | null,
) {
  const supabase = await resolveTenantSupabase(scoped);

  if (!supabase) {
    const store = getDemoRecommendationsStore();
    store.splice(0, store.length);
    return;
  }

  const { error } = await supabase
    .from("ai_recommendations")
    .delete()
    .not("id", "is", null);

  if (error) {
    throw new Error(error.message);
  }
}

async function insertRecommendations(
  rows: GeneratedRecommendation[],
  scoped?: import("@supabase/supabase-js").SupabaseClient | null,
) {
  const supabase = await resolveTenantSupabase(scoped);

  if (!supabase) {
    const store = getDemoRecommendationsStore();

    if (rows.length === 0) {
      return { inserted: 0 };
    }

    const now = new Date().toISOString();
    const payload: PersistedRecommendation[] = rows.map((row) => ({
      id: crypto.randomUUID(),
      leadId: row.leadId,
      propertyId: row.propertyId,
      recommendationType: row.recommendationType,
      title: row.title,
      description: row.description,
      priority: row.priority,
      status: row.status,
      modelVersion: row.modelVersion,
      createdAt: now,
    }));

    store.push(...payload);
    return { inserted: payload.length };
  }

  if (rows.length === 0) {
    return { inserted: 0 };
  }

  const payload = rows.map((row) => ({
    lead_id: row.leadId,
    recommendation_type: row.recommendationType,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    model_version: row.modelVersion,
  }));

  const { error } = await supabase
    .from("ai_recommendations")
    .insert(payload);

  if (error) {
    throw new Error(error.message);
  }

  return { inserted: payload.length };
}

export async function recalculateRecommendationsForLead(
  leadId: string,
  scoped?: import("@supabase/supabase-js").SupabaseClient | null,
) {
  const [leads, matchRead] = await Promise.all([
    listLeads(undefined, scoped),
    listPersistedMatches(scoped),
  ]);

  const lead = leads.find((item) => item.id === leadId);

  if (!lead) {
    throw new Error("Lead nebol nájdený.");
  }

  // Uncertain match inventory must not DELETE this lead's recommendations.
  if (!matchRead.ok) {
    console.warn(
      "[recommendations-store] match read failed — skipping lead recalculate to avoid recommendation wipe",
      { leadId },
    );
    return { leadId, inserted: 0 };
  }

  const supabase = await resolveTenantSupabase(scoped);

  if (supabase) {
    const { error: deleteError } = await supabase
      .from("ai_recommendations")
      .delete()
      .eq("lead_id", leadId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  } else {
    const store = getDemoRecommendationsStore();
    for (let i = store.length - 1; i >= 0; i -= 1) {
      if (store[i].leadId === leadId) {
        store.splice(i, 1);
      }
    }
  }

  const leadMatches = matchRead.matches.filter((item) => item.leadId === leadId);
  const recommendations = generateRecommendationsForLead(lead, leadMatches);
  const result = await insertRecommendations(recommendations, scoped);

  return {
    leadId,
    inserted: result.inserted,
  };
}

export async function recalculateAllRecommendations(
  scoped?: import("@supabase/supabase-js").SupabaseClient | null,
) {
  const [leads, matchRead] = await Promise.all([
    listLeads(undefined, scoped),
    listPersistedMatches(scoped),
  ]);

  // Empty or full LIST_MAX page ≠ complete tenant set — refuse global wipe/rebuild.
  if (leadInventoryUnsafeForGlobalClear(leads.length)) {
    console.warn(
      "[recommendations-store] lead list empty or hit LIST_MAX — skipping all recalculate to avoid recommendation wipe",
      { leadsCount: leads.length, cap: LEADS_LIST_MAX },
    );
    return {
      totalLeads: leads.length,
      totalMatches: 0,
      totalRows: 0,
    };
  }

  // Failed match read ≠ "no matches" — refuse clear-all (would drop every property_match row).
  if (!matchRead.ok) {
    console.warn(
      "[recommendations-store] match read failed — skipping all recalculate to avoid recommendation wipe",
      { leadsCount: leads.length },
    );
    return {
      totalLeads: leads.length,
      totalMatches: 0,
      totalRows: 0,
    };
  }

  const matches = matchRead.matches;

  await clearRecommendations(scoped);

  const rows = leads.flatMap((lead) => {
    const leadMatches = matches.filter((item) => item.leadId === lead.id);
    return generateRecommendationsForLead(lead, leadMatches);
  });

  const result = await insertRecommendations(rows, scoped);

  return {
    totalLeads: leads.length,
    totalMatches: matches.length,
    totalRows: result.inserted,
  };
}
