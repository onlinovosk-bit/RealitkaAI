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

/**
 * PostgREST / Supabase `max_rows` (apps/crm/supabase/config.toml). A full page
 * of lead_property_matches is not proof the tenant match set ends there —
 * clear-all then rebuild from that page drops property_match recommendations
 * for pairs outside the top page (ordered by score).
 */
export const MATCHES_READ_MAX = 1000;

function matchInventoryUnsafeForGlobalClear(matchesCount: number): boolean {
  return matchesCount >= MATCHES_READ_MAX;
}

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

function mapMatchRows(data: any[]): SimpleMatch[] {
  return data.map((item: any) => ({
    leadId: item.lead_id,
    propertyId: item.property_id,
    matchScore: Number(item.score ?? 0),
    reasons: Array.isArray(item.reasons) ? item.reasons : [],
  }));
}

async function listPersistedMatches(
  scoped?: import("@supabase/supabase-js").SupabaseClient | null,
): Promise<SimpleMatch[]> {
  const supabase = await resolveTenantSupabase(scoped);

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("lead_property_matches")
    .select("*")
    .order("score", { ascending: false })
    .limit(MATCHES_READ_MAX);

  if (error || !data) {
    console.error("listPersistedMatches error:", error?.message);
    return [];
  }

  return mapMatchRows(data);
}

/**
 * Per-lead match read. Must not load the global top-MATCHES_READ_MAX page and
 * filter in memory — a lead whose matches sit below that global cut would look
 * like "no matches", then DELETE + rebuild would replace property_match rows
 * with missing_inventory_match. Matching writes at most ~35 rows per lead, so
 * a lead-scoped select stays under the PostgREST page cap.
 */
async function listPersistedMatchesForLead(
  leadId: string,
  scoped?: import("@supabase/supabase-js").SupabaseClient | null,
): Promise<SimpleMatch[]> {
  const supabase = await resolveTenantSupabase(scoped);

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("lead_property_matches")
    .select("*")
    .eq("lead_id", leadId)
    .order("score", { ascending: false })
    .limit(MATCHES_READ_MAX);

  if (error || !data) {
    console.error("listPersistedMatchesForLead error:", error?.message);
    return [];
  }

  return mapMatchRows(data);
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
  leadIds: string[],
  scoped?: import("@supabase/supabase-js").SupabaseClient | null,
) {
  if (leadIds.length === 0) {
    return;
  }

  const supabase = await resolveTenantSupabase(scoped);

  if (!supabase) {
    const store = getDemoRecommendationsStore();
    const keep = store.filter((row) => !row.leadId || !leadIds.includes(row.leadId));
    store.splice(0, store.length, ...keep);
    return;
  }

  // Scope to session-agency lead IDs. RLS allows every agency in
  // profile_agencies_for_auth(); listLeads is single-agency — a blanket
  // delete would wipe sibling tenants and leave them empty after rebuild.
  const { error } = await supabase
    .from("ai_recommendations")
    .delete()
    .in("lead_id", leadIds);

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
  const [leads, leadMatches] = await Promise.all([
    listLeads(undefined, scoped),
    listPersistedMatchesForLead(leadId, scoped),
  ]);

  const lead = leads.find((item) => item.id === leadId);

  if (!lead) {
    throw new Error("Lead nebol nájdený.");
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
  const [leads, matches] = await Promise.all([
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
      totalMatches: matches.length,
      totalRows: 0,
    };
  }

  // Full PostgREST match page ≠ complete match inventory — refuse clear-all.
  if (matchInventoryUnsafeForGlobalClear(matches.length)) {
    console.warn(
      "[recommendations-store] match list hit MATCHES_READ_MAX — skipping all recalculate to avoid recommendation wipe",
      { matchesCount: matches.length, cap: MATCHES_READ_MAX },
    );
    return {
      totalLeads: leads.length,
      totalMatches: matches.length,
      totalRows: 0,
    };
  }

  await clearRecommendations(
    leads.map((lead) => lead.id),
    scoped,
  );

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
