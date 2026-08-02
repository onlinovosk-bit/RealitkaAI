import { createServiceRoleClient } from "@/lib/supabase/admin";

/** Dedicated platform tenant for cron/system metrics — never a paying customer. */
export const DEFAULT_SYSTEM_USAGE_AGENCY_ID =
  "00000000-0000-0000-0000-000000000001";

/**
 * Agency UUID for system-level usage (cron, guardian platform heartbeats, embeddings
 * without tenant context). Override via USAGE_SYSTEM_AGENCY_ID in env.
 *
 * Previously defaulted to Smolko's agency_id, which skewed billing and reporting.
 */
export const SYSTEM_USAGE_AGENCY_ID =
  process.env.USAGE_SYSTEM_AGENCY_ID?.trim() || DEFAULT_SYSTEM_USAGE_AGENCY_ID;

export type UsageMetricName =
  | "ai_openai_tokens"
  | "embedding_tokens"
  | "cron_daily_match"
  | "outreach_send";

/**
 * Inkrementuje denný počítadlo cez RPC (service role).
 */
export async function incrementUsageMetric(input: {
  agencyId: string;
  metric: UsageMetricName;
  delta?: number;
}): Promise<void> {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return;
  }

  const delta = input.delta ?? 1;
  const { error } = await supabase.rpc("increment_usage_metric", {
    p_agency: input.agencyId,
    p_metric: input.metric,
    p_delta: Math.max(0, Math.floor(delta)),
  });

  if (error) {
    console.warn("[usage-metrics] increment_usage_metric:", error.message);
  }
}
