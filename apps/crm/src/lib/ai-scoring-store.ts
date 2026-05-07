import { listLeads } from "@/lib/leads-store";
import { autoErrorCapture } from "./auto-error-capture";
import { listPersistedMatches } from "@/lib/matching-store";
import { listRecommendations } from "@/lib/recommendations-store";
import { listTasks } from "@/lib/tasks-store";
import { listOutreachMessages } from "@/lib/outreach-store";
import { calculateLeadAiScore, type ScoringResult } from "@/lib/ai-scoring";
import { createActivity } from "@/lib/activities-store";
import { supabaseClient, getSupabaseClient } from "@/lib/supabase/client";


  autoErrorCapture("Supabase client initialized (ai-scoring)", "getSupabaseClient");

function isMissingRecommendationColumnError(message: string | undefined) {
  const normalized = String(message ?? "").toLowerCase();
  return ["property_id", "model_version"].some((col) => normalized.includes(col));
}

export async function calculateAllLeadScores(): Promise<ScoringResult[]> {
  const [leads, matches, recommendations, tasks, messages] = await Promise.all([
    listLeads(),
    listPersistedMatches(),
    listRecommendations(),
    listTasks(),
    listOutreachMessages(),
  ]);

  return leads
    .map((lead) =>
      calculateLeadAiScore({
        lead,
        matches,
        recommendations,
        tasks,
        messages,
      })
    )
    .sort((a, b) => b.score - a.score);
}

export async function calculateSingleLeadScore(leadId: string) {
  const all = await calculateAllLeadScores();
  const item = all.find((row) => row.leadId === leadId);

  if (!item) {
    throw new Error("Lead pre scoring nebol nájdený.");
  }

  return item;
}

export async function writeScoringRecommendations(results: ScoringResult[]) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { inserted: 0 };
  }

  const leadIds = results.map((item) => item.leadId);

  const { error: deleteError } = await supabase
    .from("ai_recommendations")
    .delete()
    .in("lead_id", leadIds)
    .in("recommendation_type", ["scoring_priority", "scoring_risk", "scoring_opportunity"]);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const rows = results.map((item) => {
    const recommendationType =
      item.riskLevel === "risk"
        ? "scoring_risk"
        : item.riskLevel === "opportunity"
          ? "scoring_opportunity"
          : "scoring_priority";

    const priority =
      item.band === "critical"
        ? "high"
        : item.band === "high"
          ? "high"
          : item.band === "medium"
            ? "medium"
            : "low";

    return {
      lead_id: item.leadId,
      property_id: null,
      recommendation_type: recommendationType,
      title: `AI score ${item.score}/100`,
      description: item.nextBestAction,
      priority,
      status: "active",
      model_version: "scoring-v2",
    };
  });

  if (rows.length === 0) {
    return { inserted: 0 };
  }

  let { error: insertError } = await supabase
    .from("ai_recommendations")
    .insert(rows);

  if (insertError && isMissingRecommendationColumnError(insertError.message)) {
    const fallback = rows.map(({ property_id: _p, model_version: _m, ...rest }) => rest);
    ({ error: insertError } = await supabase.from("ai_recommendations").insert(fallback));
  }

  if (insertError) {
    throw new Error(insertError.message);
  }

  return {
    inserted: rows.length,
  };
}

export async function recalculateScoringAndRecommendations() {
  const results = await calculateAllLeadScores();
  const writeResult = await writeScoringRecommendations(results);

  try {
    await createActivity({
      leadId: null,
      type: "AI Scoring",
      title: "Globálny prepočet AI scoringu",
      text: `Bol spustený AI Scoring 2.0. Vyhodnotených leadov: ${results.length}, zapísaných scoring odporúčaní: ${writeResult.inserted}.`,
      entityType: "scoring",
      entityId: "global",
      actorName: "Systém",
      source: "ai",
      severity: "info",
      meta: {
        leads: results.length,
        insertedRecommendations: writeResult.inserted,
      },
    });
  } catch {}

  return {
    results,
    insertedRecommendations: writeResult.inserted,
  };
}

export async function recalculateSingleLeadScoring(leadId: string) {
  const result = await calculateSingleLeadScore(leadId);
  const writeResult = await writeScoringRecommendations([result]);

  try {
    await createActivity({
      leadId,
      type: "AI Scoring",
      title: "Prepočet AI scoringu pre lead",
      text: `Lead bol prepočítaný cez AI Scoring 2.0. Výsledné score: ${result.score}/100.`,
      entityType: "lead",
      entityId: leadId,
      actorName: "Systém",
      source: "ai",
      severity: "info",
      meta: result,
    });
  } catch {}

  return {
    result,
    insertedRecommendations: writeResult.inserted,
  };
}
