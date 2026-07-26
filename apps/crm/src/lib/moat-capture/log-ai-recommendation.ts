import { createHash } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/logger";
import {
  DEAL_OUTCOMES_TABLE,
  isMoatCaptureEnabled,
  MOAT_AI_RECOMMENDATIONS_TABLE,
} from "@/lib/moat-capture/capture-config";

export type MoatAiRecommendationSource = "triage" | "nba" | "ai_email" | "followup";

export type MoatAiRecommendationCaptureStatus = "shown" | "accepted" | "rejected" | "expired";

export type LogAiRecommendationInput = {
  agencyId: string;
  leadId?: string | null;
  source: MoatAiRecommendationSource;
  recommendation: string;
  reasoning?: string | null;
  confidence?: number | null;
  dedupeKey?: string | null;
  modelVersion?: string | null;
};

export type MoatCaptureSupabase = {
  from(table: typeof MOAT_AI_RECOMMENDATIONS_TABLE): {
    insert(row: Record<string, unknown>): {
      select(cols: string): Promise<{ error: { message: string; code?: string } | null }>;
    };
    update(row: Record<string, unknown>): {
      eq(col: string, val: string): Promise<{ error: { message: string } | null }>;
    };
  };
};

export function buildScopedDedupeKey(agencyId: string, dedupeKey: string): string {
  return `${agencyId}:${dedupeKey}`;
}

export function hashRecommendationDedupePart(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16);
}

export async function insertMoatAiRecommendationRow(
  input: LogAiRecommendationInput,
  client?: MoatCaptureSupabase | null,
): Promise<void> {
  const supabase = client ?? (createServiceRoleClient() as MoatCaptureSupabase | null);
  if (!supabase) return;

  const recommendation = input.recommendation.trim();
  if (!recommendation) return;

  const scopedDedupe =
    input.dedupeKey != null && input.dedupeKey !== ""
      ? buildScopedDedupeKey(input.agencyId, input.dedupeKey)
      : null;

  const row: Record<string, unknown> = {
    agency_id: input.agencyId,
    lead_id: input.leadId ?? null,
    source: input.source,
    recommendation,
    reasoning: input.reasoning ?? null,
    confidence: input.confidence ?? null,
    status: "shown",
    model_version: input.modelVersion ?? null,
    dedupe_key: scopedDedupe,
  };

  const { error } = await supabase.from(MOAT_AI_RECOMMENDATIONS_TABLE).insert(row).select("id");

  if (error?.code === "23505") {
    return;
  }
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Fire-and-forget AI recommendation capture. Never throws to callers.
 */
export function logAiRecommendation(input: LogAiRecommendationInput): void {
  if (!isMoatCaptureEnabled()) return;

  void (async () => {
    try {
      await insertMoatAiRecommendationRow(input);
    } catch (err) {
      logError("[moat-capture] logAiRecommendation failed", {
        source: input.source,
        leadId: input.leadId ?? null,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  })();
}

export async function updateMoatAiRecommendationStatus(params: {
  agencyId: string;
  dedupeKey: string;
  status: Extract<MoatAiRecommendationCaptureStatus, "accepted" | "rejected">;
  client?: MoatCaptureSupabase | null;
}): Promise<void> {
  const supabase = params.client ?? (createServiceRoleClient() as MoatCaptureSupabase | null);
  if (!supabase) return;

  const scoped = buildScopedDedupeKey(params.agencyId, params.dedupeKey);
  const { error } = await supabase
    .from(MOAT_AI_RECOMMENDATIONS_TABLE)
    .update({
      status: params.status,
      acted_at: new Date().toISOString(),
    })
    .eq("dedupe_key", scoped);

  if (error) {
    throw new Error(error.message);
  }
}

/** Fire-and-forget NBA accept/reject capture update. */
export function captureAiRecommendationReaction(params: {
  agencyId: string;
  dedupeKey: string;
  status: "accepted" | "rejected";
}): void {
  if (!isMoatCaptureEnabled()) return;

  void (async () => {
    try {
      await updateMoatAiRecommendationStatus(params);
    } catch (err) {
      logError("[moat-capture] captureAiRecommendationReaction failed", {
        dedupeKey: params.dedupeKey,
        status: params.status,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  })();
}
