import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildDNA,
  calculateRisk,
  combineRiskScore,
  detectMoment,
  generateAction,
  type LeadEventInput,
  processLead,
} from "@/lib/ai/engine";

export type LeadEventRow = {
  id: string;
  agency_id: string | null;
  lead_id: string;
  type: string;
  value: string;
  created_at: string;
};

export type EnterpriseInsightRow = {
  id: string;
  lead_id: string;
  lead_name: string;
  action: string;
  reason: string;
  executed: boolean;
  created_at: string;
  score: number | null;
  risk: number | null;
  is_hot: boolean | null;
};

export type LeadLookup =
  | { found: true; agencyId: string | null }
  | { found: false };

export async function fetchLeadAgencyId(
  supabase: SupabaseClient,
  leadId: string
): Promise<LeadLookup> {
  const { data, error } = await supabase
    .from("leads")
    .select("agency_id")
    .eq("id", leadId)
    .maybeSingle();

  if (error) return { found: false };
  if (data === null) return { found: false };
  return { found: true, agencyId: data.agency_id ?? null };
}

export async function fetchLeadEventsOrdered(
  supabase: SupabaseClient,
  leadId: string
): Promise<LeadEventInput[]> {
  const { data, error } = await supabase
    .from("lead_events")
    .select("type, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data.map((row) => ({
    type: row.type,
    created_at: row.created_at,
  }));
}

export async function runEnterprisePipelineAndPersist(input: {
  supabase: SupabaseClient;
  leadId: string;
  agencyId: string | null;
}): Promise<{
  score: number;
  risk: number;
  isHot: boolean;
  action: { action: string; reason: string };
  dna: ReturnType<typeof buildDNA>;
}> {
  const { supabase, leadId, agencyId } = input;
  const events = await fetchLeadEventsOrdered(supabase, leadId);

  const { score, inactivityRiskBoost } = processLead({}, events);
  const baseRisk = calculateRisk(events);
  const risk = combineRiskScore(baseRisk, inactivityRiskBoost);
  const isHot = detectMoment(events);
  const dna = buildDNA(events);
  const action = generateAction({}, score, risk, isHot);

  const now = new Date().toISOString();

  await supabase.from("lead_scores").upsert(
    {
      agency_id: agencyId,
      lead_id: leadId,
      score,
      risk_score: risk,
      updated_at: now,
    },
    { onConflict: "lead_id" }
  );

  await supabase.from("client_dna").upsert(
    {
      agency_id: agencyId,
      lead_id: leadId,
      type: dna.type,
      price_sensitivity: dna.price_sensitivity,
      decision_speed: dna.decision_speed,
      notes: "",
      updated_at: now,
    },
    { onConflict: "lead_id" }
  );

  await supabase.from("deal_risk").upsert(
    {
      agency_id: agencyId,
      lead_id: leadId,
      risk_level: risk,
      reason:
        risk > 60
          ? "dlhá neaktivita alebo nízky záujem"
          : "aktivita v norme",
      updated_at: now,
    },
    { onConflict: "lead_id" }
  );

  if (isHot) {
    await supabase.from("deal_moments").insert({
      agency_id: agencyId,
      lead_id: leadId,
      is_hot: true,
      trigger: "click v posledných udalostiach",
    });
  }

  await supabase.from("ai_actions").insert({
    agency_id: agencyId,
    lead_id: leadId,
    action: action.action,
    reason: action.reason,
    executed: false,
  });

  return { score, risk, isHot, action, dna };
}

export async function listEnterpriseInsights(
  supabase: SupabaseClient,
  agencyId: string | null,
  limit = 30
): Promise<EnterpriseInsightRow[]> {
  let q = supabase
    .from("ai_actions")
    .select("id, lead_id, action, reason, executed, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (agencyId) {
    q = q.eq("agency_id", agencyId);
  }

  const { data: actions, error } = await q;
  if (error || !actions?.length) {
    return [];
  }

  const leadIds = [...new Set(actions.map((a) => a.lead_id))];

  const [{ data: leads }, { data: scores }] = await Promise.all([
    supabase.from("leads").select("id, name").in("id", leadIds),
    supabase
      .from("lead_scores")
      .select("lead_id, score, risk_score")
      .in("lead_id", leadIds),
  ]);

  const nameById = new Map((leads ?? []).map((l) => [l.id, l.name]));
  const scoreByLead = new Map(
    (scores ?? []).map((s) => [
      s.lead_id,
      { score: s.score, risk: s.risk_score },
    ])
  );

  return actions.map((row) => {
    const s = scoreByLead.get(row.lead_id);
    return {
      id: row.id,
      lead_id: row.lead_id,
      lead_name: nameById.get(row.lead_id) ?? "—",
      action: row.action,
      reason: row.reason,
      executed: row.executed,
      created_at: row.created_at,
      score: s?.score ?? null,
      risk: s?.risk ?? null,
      is_hot: null,
    };
  });
}
