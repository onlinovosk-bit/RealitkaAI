import { createServiceRoleClient } from "@/lib/supabase/admin";

/** Demo / systémová agentúra – metriky bez konkrétneho tenanta (cron). */
export const SYSTEM_USAGE_AGENCY_ID =
  process.env.USAGE_SYSTEM_AGENCY_ID?.trim() ||
  "11111111-1111-1111-1111-111111111111";

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
