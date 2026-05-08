import { supabaseClient, getSupabaseClient } from "@/lib/supabase/client";
import { listLeads, getLead } from "@/lib/leads-store";
import { listProperties, getProperty } from "@/lib/properties-store";
import { getMatchingPropertiesForLead, getMatchingLeadsForProperty } from "@/lib/matching";

export type PersistedLeadPropertyMatch = {
  id: string;
  leadId: string;
  propertyId: string;
  matchScore: number;
  reasons: string[];
  modelVersion: string;
  status?: string;
  createdAt?: string;
};

export type LeadPropertyMatchSummary = {
  total: number;
  sent: number;
  viewed: number;
  interested: number;
  rejected: number;
  avgScore: number;
};

export type LeadPropertyMatchPerformanceItem = {
  id: string;
  label: string;
  total: number;
  interested: number;
  conversionRate: number;
  avgScore: number;
};

export type LeadPropertyMatchPerformanceSummary = {
  byAgent: LeadPropertyMatchPerformanceItem[];
  byTeam: LeadPropertyMatchPerformanceItem[];
};

export type LeadPropertyMatchListItem = PersistedLeadPropertyMatch & {
  propertyTitle: string;
  propertyLocation: string;
};

const MATCH_DB_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_MATCHING_DB_TIMEOUT_MS ?? "8000");

function isRecoverableMatchingError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();
  return ["timeout", "timed out", "statement timeout", "canceling statement",
    "failed to fetch", "fetch failed", "networkerror", "network error",
    "econnreset", "etimedout", "gateway timeout", "service unavailable",
  ].some(t => msg.includes(t));
}

async function withMatchingTimeout<T>(label: string, p: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Matching DB timeout (${label}) after ${MATCH_DB_TIMEOUT_MS}ms`)), MATCH_DB_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function isMissingMatchingColumnError(message: string | undefined) {
  const normalized = String(message ?? "").toLowerCase();
  return ["model_version", "reasons"].some((col) => normalized.includes(col));
}

function payloadWithoutOptionalColumns(row: {
  lead_id: string;
  property_id: string;
  score: number;
  reasons: string[];
  model_version: string;
}) {
  return { lead_id: row.lead_id, property_id: row.property_id, score: row.score };
}

export async function listPersistedMatches(): Promise<PersistedLeadPropertyMatch[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return [];
  }

  let data: any[] | null = null;
  let error: any = null;
  try {
    ({ data, error } = await withMatchingTimeout(
      "listPersistedMatches",
      Promise.resolve(
        supabase
          .from("lead_property_matches")
          .select("*")
          .order("score", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1000)
      )
    ));
  } catch (err) {
    if (isRecoverableMatchingError(err)) {
      console.warn("[matching-store] DB timeout, using transient calculation");
      return [];
    }
    throw err;
  }

  if (error || !data) {
    console.error("listPersistedMatches error:", error?.message);
    return [];
  }

  return data.map((item: any) => ({
    id: item.id,
    leadId: item.lead_id,
    propertyId: item.property_id,
    matchScore: Number(item.score ?? item.match_score ?? 0),
    reasons: Array.isArray(item.reasons) ? item.reasons : [],
    modelVersion: item.model_version ?? "v2",
    status: item.status ?? "sent",
    createdAt: item.created_at,
  }));
}

export async function listLeadPropertyMatchesByLeadId(
  leadId: string
): Promise<LeadPropertyMatchListItem[]> {
  const [matches, properties] = await Promise.all([
    listPersistedMatches(),
    listProperties(),
  ]);

  const byPropertyId = new Map(properties.map((item) => [item.id, item]));

  return matches
    .filter((item) => item.leadId === leadId)
    .map((item) => {
      const property = byPropertyId.get(item.propertyId);

      return {
        ...item,
        status: item.status ?? "sent",
        propertyTitle: property?.title ?? item.propertyId,
        propertyLocation: property?.location ?? "-",
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

export async function updateLeadPropertyMatchStatus(
  leadId: string,
  matchId: string,
  status: string
): Promise<{ match: LeadPropertyMatchListItem; previousStatus: string | null }> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase nie je nastavený. Matching sa nedá aktualizovať.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("lead_property_matches")
    .select("*")
    .eq("id", matchId)
    .eq("lead_id", leadId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (!existing) {
    throw new Error("Matching záznam sa nenašiel.");
  }

  const previousStatus = existing.status ?? "sent";

  const { data: updated, error: updateError } = await supabase
    .from("lead_property_matches")
    .update({ status })
    .eq("id", matchId)
    .eq("lead_id", leadId)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  const property = await getProperty(updated.property_id);

  return {
    previousStatus,
    match: {
      id: updated.id,
      leadId: updated.lead_id,
      propertyId: updated.property_id,
      matchScore: Number(updated.score ?? updated.match_score ?? 0),
      reasons: Array.isArray(updated.reasons) ? updated.reasons : [],
      modelVersion: updated.model_version ?? "v2",
      status: updated.status ?? status,
      createdAt: updated.created_at,
      propertyTitle: property?.title ?? updated.property_id,
      propertyLocation: property?.location ?? "-",
    },
  };
}

export async function getLeadPropertyMatchSummary(): Promise<LeadPropertyMatchSummary> {
  const matches = await listPersistedMatches();

  const summary = matches.reduce(
    (acc, item) => {
      const status = item.status ?? "sent";

      if (status === "viewed") acc.viewed += 1;
      else if (status === "interested") acc.interested += 1;
      else if (status === "rejected") acc.rejected += 1;
      else acc.sent += 1;

      acc.total += 1;
      acc.scoreTotal += item.matchScore;
      return acc;
    },
    {
      total: 0,
      sent: 0,
      viewed: 0,
      interested: 0,
      rejected: 0,
      scoreTotal: 0,
    }
  );

  return {
    total: summary.total,
    sent: summary.sent,
    viewed: summary.viewed,
    interested: summary.interested,
    rejected: summary.rejected,
    avgScore: summary.total > 0 ? Math.round(summary.scoreTotal / summary.total) : 0,
  };
}

export async function getLeadPropertyMatchPerformanceSummary(): Promise<LeadPropertyMatchPerformanceSummary> {
  const [matches, leads] = await Promise.all([listPersistedMatches(), listLeads()]);

  const leadById = new Map(leads.map((lead) => [lead.id, lead]));
  const agentMap = new Map<string, { label: string; total: number; interested: number; scoreTotal: number }>();
  const teamMap = new Map<string, { label: string; total: number; interested: number; scoreTotal: number }>();

  for (const match of matches) {
    const lead = leadById.get(match.leadId);
    const agentId = lead?.assignedProfileId || lead?.assignedAgent || "unassigned";
    const agentLabel = lead?.assignedAgent || "Nepriradený";
    const teamId = lead?.source || "unknown";
    const teamLabel = lead?.source || "Bez tímu";

    const currentAgent = agentMap.get(agentId) || {
      label: agentLabel,
      total: 0,
      interested: 0,
      scoreTotal: 0,
    };

    currentAgent.total += 1;
    currentAgent.scoreTotal += match.matchScore;
    if ((match.status ?? "sent") === "interested") currentAgent.interested += 1;
    agentMap.set(agentId, currentAgent);

    const currentTeam = teamMap.get(teamId) || {
      label: teamLabel,
      total: 0,
      interested: 0,
      scoreTotal: 0,
    };

    currentTeam.total += 1;
    currentTeam.scoreTotal += match.matchScore;
    if ((match.status ?? "sent") === "interested") currentTeam.interested += 1;
    teamMap.set(teamId, currentTeam);
  }

  const toRows = (source: Map<string, { label: string; total: number; interested: number; scoreTotal: number }>) => {
    return [...source.entries()]
      .map(([id, value]) => ({
        id,
        label: value.label,
        total: value.total,
        interested: value.interested,
        conversionRate: value.total > 0 ? Math.round((value.interested / value.total) * 100) : 0,
        avgScore: value.total > 0 ? Math.round(value.scoreTotal / value.total) : 0,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  };

  return {
    byAgent: toRows(agentMap),
    byTeam: toRows(teamMap),
  };
}

export async function recalculateMatchesForLead(leadId: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase nie je nastavený. Matching sa nedá zapísať do databázy.");
  }

  const lead = await getLead(leadId);
  const properties = await listProperties();

  if (!lead) {
    throw new Error("Lead nebol nájdený.");
  }

  const matches = getMatchingPropertiesForLead(lead, properties, 35);

  try {
    const { error: deleteError } = await withMatchingTimeout(
      "recalculateLead:delete",
      Promise.resolve(supabase.from("lead_property_matches").delete().eq("lead_id", leadId))
    );

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  } catch (err) {
    if (isRecoverableMatchingError(err)) {
      console.warn("[matching-store] DB write timeout on recalculate — skipping persist");
      return { mode: "lead" as const, leadId, inserted: 0 };
    }
    throw err;
  }

  if (matches.length === 0) {
    return {
      mode: "lead" as const,
      leadId,
      inserted: 0,
    };
  }

  const payload = matches.map((match) => ({
    lead_id: lead.id,
    property_id: match.propertyId,
    score: match.matchScore,
    reasons: match.reasons,
    model_version: "v2",
  }));

  try {
    let { error: insertError } = await withMatchingTimeout(
      "recalculateLead:insert",
      Promise.resolve(supabase.from("lead_property_matches").insert(payload))
    );

    if (insertError && isMissingMatchingColumnError(insertError.message)) {
      const fallback = payload.map(payloadWithoutOptionalColumns);
      ({ error: insertError } = await withMatchingTimeout(
        "recalculateLead:insert:fallback",
        Promise.resolve(supabase.from("lead_property_matches").insert(fallback))
      ));
    }

    if (insertError) {
      throw new Error(insertError.message);
    }
  } catch (err) {
    if (isRecoverableMatchingError(err)) {
      console.warn("[matching-store] DB write timeout on recalculate — skipping persist");
      return { mode: "lead" as const, leadId, inserted: 0 };
    }
    throw err;
  }

  return {
    mode: "lead" as const,
    leadId,
    inserted: payload.length,
  };
}

export async function recalculateMatchesForProperty(propertyId: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase nie je nastavený. Matching sa nedá zapísať do databázy.");
  }

  const property = await getProperty(propertyId);
  const leads = await listLeads();

  if (!property) {
    throw new Error("Nehnuteľnosť nebola nájdená.");
  }

  const leadMatches = getMatchingLeadsForProperty(property, leads, 35);

  try {
    const { error: deleteError } = await withMatchingTimeout(
      "recalculateProperty:delete",
      Promise.resolve(supabase.from("lead_property_matches").delete().eq("property_id", propertyId))
    );

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  } catch (err) {
    if (isRecoverableMatchingError(err)) {
      console.warn("[matching-store] DB write timeout on recalculate — skipping persist");
      return { mode: "property" as const, propertyId, inserted: 0 };
    }
    throw err;
  }

  if (leadMatches.length === 0) {
    return {
      mode: "property" as const,
      propertyId,
      inserted: 0,
    };
  }

  const payload = leadMatches.map((match) => ({
    lead_id: match.leadId,
    property_id: property.id,
    score: match.matchScore,
    reasons: match.reasons,
    model_version: "v2",
  }));

  try {
    let { error: insertError } = await withMatchingTimeout(
      "recalculateProperty:insert",
      Promise.resolve(supabase.from("lead_property_matches").insert(payload))
    );

    if (insertError && isMissingMatchingColumnError(insertError.message)) {
      const fallback = payload.map(payloadWithoutOptionalColumns);
      ({ error: insertError } = await withMatchingTimeout(
        "recalculateProperty:insert:fallback",
        Promise.resolve(supabase.from("lead_property_matches").insert(fallback))
      ));
    }

    if (insertError) {
      throw new Error(insertError.message);
    }
  } catch (err) {
    if (isRecoverableMatchingError(err)) {
      console.warn("[matching-store] DB write timeout on recalculate — skipping persist");
      return { mode: "property" as const, propertyId, inserted: 0 };
    }
    throw err;
  }

  return {
    mode: "property" as const,
    propertyId,
    inserted: payload.length,
  };
}

export async function recalculateAllMatches() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase nie je nastavený. Matching sa nedá zapísať do databázy.");
  }

  const [leads, properties] = await Promise.all([listLeads(), listProperties()]);

  try {
    const { error: deleteError } = await withMatchingTimeout(
      "recalculateAll:delete",
      Promise.resolve(supabase.from("lead_property_matches").delete().not("id", "is", null))
    );

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  } catch (err) {
    if (isRecoverableMatchingError(err)) {
      console.warn("[matching-store] DB write timeout on recalculate — skipping persist");
      return { mode: "all" as const, totalRows: 0, totalLeads: leads.length, totalProperties: properties.length };
    }
    throw err;
  }

  const rows = leads.flatMap((lead) => {
    const matches = getMatchingPropertiesForLead(lead, properties, 35);

    return matches.map((match) => ({
      lead_id: lead.id,
      property_id: match.propertyId,
      score: match.matchScore,
      reasons: match.reasons,
      model_version: "v2",
    }));
  });

  if (rows.length === 0) {
    return {
      mode: "all",
      totalRows: 0,
      totalLeads: leads.length,
      totalProperties: properties.length,
    };
  }

  try {
    let { error: insertError } = await withMatchingTimeout(
      "recalculateAll:insert",
      Promise.resolve(supabase.from("lead_property_matches").insert(rows))
    );

    if (insertError && isMissingMatchingColumnError(insertError.message)) {
      const fallback = rows.map(payloadWithoutOptionalColumns);
      ({ error: insertError } = await withMatchingTimeout(
        "recalculateAll:insert:fallback",
        Promise.resolve(supabase.from("lead_property_matches").insert(fallback))
      ));
    }

    if (insertError) {
      throw new Error(insertError.message);
    }
  } catch (err) {
    if (isRecoverableMatchingError(err)) {
      console.warn("[matching-store] DB write timeout on recalculate — skipping persist");
      return { mode: "all" as const, totalRows: 0, totalLeads: leads.length, totalProperties: properties.length };
    }
    throw err;
  }

  return {
    mode: "all" as const,
    totalRows: rows.length,
    totalLeads: leads.length,
    totalProperties: properties.length,
  };
}
