import { supabaseClient, getSupabaseClient } from "@/lib/supabase/client";
import { listLeads } from "@/lib/leads-store";
import { generateRecommendationsForLead, type GeneratedRecommendation, type SimpleMatch } from "@/lib/recommendations-engine";

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

async function listPersistedMatches(): Promise<SimpleMatch[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("lead_property_matches")
    .select("*")
    .order("score", { ascending: false });

  if (error || !data) {
    console.error("listPersistedMatches error:", error?.message);
    return [];
  }

  return data.map((item: any) => ({
    leadId: item.lead_id,
    propertyId: item.property_id,
    matchScore: Number(item.score ?? 0),
    reasons: Array.isArray(item.reasons) ? item.reasons : [],
  }));
}

export async function listRecommendations(): Promise<PersistedRecommendation[]> {
  const supabase = getSupabaseClient();

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

async function clearRecommendations() {
  const supabase = getSupabaseClient();

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

async function insertRecommendations(rows: GeneratedRecommendation[]) {
  const supabase = getSupabaseClient();

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

export async function recalculateRecommendationsForLead(leadId: string) {
  const [leads, matches] = await Promise.all([
    listLeads(),
    listPersistedMatches(),
  ]);

  const lead = leads.find((item) => item.id === leadId);

  if (!lead) {
    throw new Error("Lead nebol nájdený.");
  }

  const supabase = getSupabaseClient();

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

  const leadMatches = matches.filter((item) => item.leadId === leadId);
  const recommendations = generateRecommendationsForLead(lead, leadMatches);
  const result = await insertRecommendations(recommendations);

  return {
    leadId,
    inserted: result.inserted,
  };
}

export async function recalculateAllRecommendations() {
  const [leads, matches] = await Promise.all([
    listLeads(),
    listPersistedMatches(),
  ]);

  await clearRecommendations();

  const rows = leads.flatMap((lead) => {
    const leadMatches = matches.filter((item) => item.leadId === lead.id);
    return generateRecommendationsForLead(lead, leadMatches);
  });

  const result = await insertRecommendations(rows);

  return {
    totalLeads: leads.length,
    totalMatches: matches.length,
    totalRows: result.inserted,
  };
}
