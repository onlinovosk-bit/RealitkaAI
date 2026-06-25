import { createServiceRoleClient } from "@/lib/supabase/admin";
import { FOLLOWUP_AGENT_NAME } from "@/lib/agents/followup/constants";
import type { Prediction } from "@/lib/agents/followup/types";

export type DecisionInsertRow = {
  agency_id: string;
  lead_id: string;
  agent: string;
  decision: string;
  p_outcome: number;
  expected_value_eur: number;
  confidence: number;
  expected_outcome: string;
  status: "open";
};

export type PredictionWriterClient = {
  from(table: "decisions"): {
    insert(row: DecisionInsertRow): {
      select(cols: string): {
        single(): Promise<{ data: { id: string } | null; error: { message: string } | null }>;
      };
    };
  };
};

export function toDecisionRow(prediction: Prediction): DecisionInsertRow {
  return {
    agency_id: prediction.agency_id,
    lead_id: prediction.lead_id,
    agent: FOLLOWUP_AGENT_NAME,
    decision: prediction.decision,
    p_outcome: prediction.p_outcome,
    expected_value_eur: prediction.expected_value_eur,
    confidence: prediction.confidence,
    expected_outcome: prediction.expected_outcome,
    status: "open",
  };
}

export async function writeOpenPrediction(
  prediction: Prediction,
  client?: PredictionWriterClient | null,
): Promise<{ id: string } | null> {
  const supabase = client ?? (createServiceRoleClient() as PredictionWriterClient | null);
  if (!supabase) {
    throw new Error("Supabase service role client unavailable");
  }

  const { data, error } = await supabase
    .from("decisions")
    .insert(toDecisionRow(prediction))
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function writeOpenPredictions(
  predictions: Prediction[],
  client?: PredictionWriterClient | null,
): Promise<string[]> {
  const ids: string[] = [];
  for (const prediction of predictions) {
    const row = await writeOpenPrediction(prediction, client);
    if (row?.id) ids.push(row.id);
  }
  return ids;
}
