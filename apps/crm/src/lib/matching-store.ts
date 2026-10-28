import { supabaseClient, getSupabaseClient } from "@/lib/supabase/client";
import { resolveTenantSupabase } from "@/lib/supabase/resolve-client";
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

type MatchWriteRow = {
  lead_id: string;
  property_id: string;
  score: number;
  reasons: string[];
  model_version: string;
};

type MatchPersistScope =
  | { kind: "lead"; leadId: string }
  | { kind: "property"; propertyId: string }
  | { kind: "all" };

/**
 * Persist recalculated matches without a wipe window.
 *
 * Old path was DELETE then INSERT: an insert/network timeout after a successful
 * delete returned `{inserted:0}` and left the lead/property/agency with no
 * matches (HTTP 200). Unique (lead_id, property_id) lets us upsert first, then
 * delete orphans — upsert failure keeps prior rows.
 */
async function upsertMatchRows(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  label: string,
  rows: MatchWriteRow[],
): Promise<void> {
  let { error } = await withMatchingTimeout(
    `${label}:upsert`,
    Promise.resolve(
      supabase.from("lead_property_matches").upsert(rows, { onConflict: "lead_id,property_id" }),
    ),
  );

  if (error && isMissingMatchingColumnError(error.message)) {
    const fallback = rows.map(payloadWithoutOptionalColumns);
    ({ error } = await withMatchingTimeout(
      `${label}:upsert:fallback`,
      Promise.resolve(
        supabase.from("lead_property_matches").upsert(fallback, { onConflict: "lead_id,property_id" }),
      ),
    ));
  }

  if (error) {
    throw new Error(error.message);
  }
}

async function deleteOrphanMatchRows(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  label: string,
  scope: MatchPersistScope,
  keep: MatchWriteRow[],
): Promise<void> {
  const table = () => supabase.from("lead_property_matches");

  if (scope.kind === "lead") {
    if (keep.length === 0) {
      const { error } = await withMatchingTimeout(
        `${label}:delete-scope`,
        Promise.resolve(table().delete().eq("lead_id", scope.leadId)),
      );
      if (error) throw new Error(error.message);
      return;
    }

    const keepProps = new Set(keep.map((row) => row.property_id));
    const { data, error: selectError } = await withMatchingTimeout(
      `${label}:list-orphans`,
      Promise.resolve(table().select("id, property_id").eq("lead_id", scope.leadId)),
    );
    if (selectError) throw new Error(selectError.message);
    const orphanIds = (data ?? [])
      .filter((row: { id: string; property_id: string }) => !keepProps.has(row.property_id))
      .map((row: { id: string }) => row.id);
    if (orphanIds.length === 0) return;
    const { error } = await withMatchingTimeout(
      `${label}:delete-orphans`,
      Promise.resolve(table().delete().in("id", orphanIds)),
    );
    if (error) throw new Error(error.message);
    return;
  }

  if (scope.kind === "property") {
    if (keep.length === 0) {
      const { error } = await withMatchingTimeout(
        `${label}:delete-scope`,
        Promise.resolve(table().delete().eq("property_id", scope.propertyId)),
      );
      if (error) throw new Error(error.message);
      return;
    }

    const keepLeads = new Set(keep.map((row) => row.lead_id));
    const { data, error: selectError } = await withMatchingTimeout(
      `${label}:list-orphans`,
      Promise.resolve(table().select("id, lead_id").eq("property_id", scope.propertyId)),
    );
    if (selectError) throw new Error(selectError.message);
    const orphanIds = (data ?? [])
      .filter((row: { id: string; lead_id: string }) => !keepLeads.has(row.lead_id))
      .map((row: { id: string }) => row.id);
    if (orphanIds.length === 0) return;
    const { error } = await withMatchingTimeout(
      `${label}:delete-orphans`,
      Promise.resolve(table().delete().in("id", orphanIds)),
    );
    if (error) throw new Error(error.message);
    return;
  }

  // kind === "all"
  if (keep.length === 0) {
    const { error } = await withMatchingTimeout(
      `${label}:delete-scope`,
      Promise.resolve(table().delete().not("id", "is", null)),
    );
    if (error) throw new Error(error.message);
    return;
  }

  const keepKeys = new Set(keep.map((row) => `${row.lead_id}:${row.property_id}`));
  const { data, error: selectError } = await withMatchingTimeout(
    `${label}:list-orphans`,
    Promise.resolve(table().select("id, lead_id, property_id")),
  );
  if (selectError) throw new Error(selectError.message);
  const orphanIds = (data ?? [])
    .filter(
      (row: { id: string; lead_id: string; property_id: string }) =>
        !keepKeys.has(`${row.lead_id}:${row.property_id}`),
    )
    .map((row: { id: string }) => row.id);
  if (orphanIds.length === 0) return;
  const { error } = await withMatchingTimeout(
    `${label}:delete-orphans`,
    Promise.resolve(table().delete().in("id", orphanIds)),
  );
  if (error) throw new Error(error.message);
}

/**
 * Upsert new rows, then remove orphans. Never deletes before a successful write
 * when there is something to write — so a timeout cannot empty the table.
 */
async function persistRecalculatedMatches(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  label: string,
  scope: MatchPersistScope,
  rows: MatchWriteRow[],
): Promise<{ written: number; preservedExisting: boolean }> {
  if (rows.length > 0) {
    try {
      await upsertMatchRows(supabase, label, rows);
    } catch (err) {
      if (isRecoverableMatchingError(err)) {
        console.warn(
          "[matching-store] DB write timeout on recalculate upsert — keeping existing matches",
        );
        return { written: 0, preservedExisting: true };
      }
      throw err;
    }
  }

  try {
    await deleteOrphanMatchRows(supabase, label, scope, rows);
  } catch (err) {
    if (isRecoverableMatchingError(err)) {
      // New rows (if any) are already stored; orphan cleanup can retry later.
      console.warn(
        "[matching-store] DB timeout on orphan cleanup after upsert — stale extras may remain",
      );
      return { written: rows.length, preservedExisting: false };
    }
    throw err;
  }

  return { written: rows.length, preservedExisting: false };
}

export async function listPersistedMatches(
  scopedSupabase?: import("@supabase/supabase-js").SupabaseClient | null,
): Promise<PersistedLeadPropertyMatch[]> {
  const supabase = await resolveTenantSupabase(scopedSupabase);

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
  status: string,
  /**
   * Request-scoped client. Server callers MUST pass it: without it this falls
   * back to the cookie-less browser singleton, RLS rejects the write (after
   * matches_anon_legacy_all drop) and match status never persists.
   */
  scoped?: import("@supabase/supabase-js").SupabaseClient | null,
): Promise<{ match: LeadPropertyMatchListItem; previousStatus: string | null }> {
  const supabase = await resolveTenantSupabase(scoped);

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

  const property = await getProperty(updated.property_id, scoped);

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

export async function recalculateMatchesForLead(
  leadId: string,
  scoped?: import("@supabase/supabase-js").SupabaseClient | null,
) {
  const supabase = await resolveTenantSupabase(scoped);

  if (!supabase) {
    throw new Error("Supabase nie je nastavený. Matching sa nedá zapísať do databázy.");
  }

  const lead = await getLead(leadId, scoped);
  const properties = await listProperties(undefined, scoped);

  if (!lead) {
    throw new Error("Lead nebol nájdený.");
  }

  // An empty read is not evidence that no property fits: keep what is stored.
  // Same guard as recalculateMatchesForProperty / recalculateAllMatches.
  // listProperties soft-fails to [] in production on DB errors — without this
  // guard a lead save would DELETE every match for that lead and insert 0.
  if (properties.length === 0) {
    return { mode: "lead" as const, leadId, inserted: 0 };
  }

  const matches = getMatchingPropertiesForLead(lead, properties, 35);
  const payload = matches.map((match) => ({
    lead_id: lead.id,
    property_id: match.propertyId,
    score: match.matchScore,
    reasons: match.reasons,
    model_version: "v2",
  }));

  const persist = await persistRecalculatedMatches(
    supabase,
    "recalculateLead",
    { kind: "lead", leadId },
    payload,
  );

  return {
    mode: "lead" as const,
    leadId,
    inserted: persist.written,
  };
}

export async function recalculateMatchesForProperty(
  propertyId: string,
  scoped?: import("@supabase/supabase-js").SupabaseClient | null,
) {
  const supabase = await resolveTenantSupabase(scoped);

  if (!supabase) {
    throw new Error("Supabase nie je nastavený. Matching sa nedá zapísať do databázy.");
  }

  // Reads go through the same client as the writes. Without it, on the server
  // they fell back to the browser singleton, found no agency and returned
  // nothing, while the delete below still removed the property's matches.
  const property = await getProperty(propertyId, scoped);
  const leads = await listLeads(undefined, scoped);

  if (!property) {
    throw new Error("Nehnuteľnosť nebola nájdená.");
  }

  // An empty read is not evidence that no lead fits: keep what is stored.
  if (leads.length === 0) {
    return { mode: "property" as const, propertyId, inserted: 0 };
  }

  const leadMatches = getMatchingLeadsForProperty(property, leads, 35);
  const payload = leadMatches.map((match) => ({
    lead_id: match.leadId,
    property_id: property.id,
    score: match.matchScore,
    reasons: match.reasons,
    model_version: "v2",
  }));

  const persist = await persistRecalculatedMatches(
    supabase,
    "recalculateProperty",
    { kind: "property", propertyId },
    payload,
  );

  return {
    mode: "property" as const,
    propertyId,
    inserted: persist.written,
  };
}

export async function recalculateAllMatches(
  scoped?: import("@supabase/supabase-js").SupabaseClient | null,
) {
  const supabase = await resolveTenantSupabase(scoped);

  if (!supabase) {
    throw new Error("Supabase nie je nastavený. Matching sa nedá zapísať do databázy.");
  }

  // Same client for reads and writes (see recalculateMatchesForProperty).
  const [leads, properties] = await Promise.all([
    listLeads(undefined, scoped),
    listProperties(undefined, scoped),
  ]);

  // An empty read is not evidence that nothing matches. Since May every global
  // recalculation read nothing, deleted every match and wrote 0.
  if (leads.length === 0 || properties.length === 0) {
    return { mode: "all" as const, totalRows: 0, totalLeads: leads.length, totalProperties: properties.length };
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

  const persist = await persistRecalculatedMatches(
    supabase,
    "recalculateAll",
    { kind: "all" },
    rows,
  );

  return {
    mode: "all" as const,
    totalRows: persist.written,
    totalLeads: leads.length,
    totalProperties: properties.length,
  };
}
