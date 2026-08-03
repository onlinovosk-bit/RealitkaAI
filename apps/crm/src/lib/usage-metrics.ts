import { createServiceRoleClient } from "@/lib/supabase/admin";

/** Dedicated platform tenant for cron/system metrics — never a paying customer. */
export const DEFAULT_SYSTEM_USAGE_AGENCY_ID =
  "00000000-0000-0000-0000-000000000001";

/**
 * Agency UUID for system-level usage (cron, guardian platform heartbeats, embeddings
 * without tenant context). Override via USAGE_SYSTEM_AGENCY_ID in env.
 *
 * Previously defaulted to Smolko's agency_id, which skewed billing and reporting.
 * Wave 3A (#343) moved the default to DEFAULT_SYSTEM_USAGE_AGENCY_ID.
 * Residual from profit-leak patch 04: refuse env misconfig pointing at a customer.
 */
export const SYSTEM_USAGE_AGENCY_ID =
  process.env.USAGE_SYSTEM_AGENCY_ID?.trim() || DEFAULT_SYSTEM_USAGE_AGENCY_ID;

/** Paying-customer agency IDs that must never be used as SYSTEM_USAGE_AGENCY_ID. */
const RESERVED_CUSTOMER_AGENCY_IDS = new Set([
  "11111111-1111-1111-1111-111111111111", // Reality Smolko
]);

if (RESERVED_CUSTOMER_AGENCY_IDS.has(SYSTEM_USAGE_AGENCY_ID)) {
  console.error(
    "[usage-metrics] SYSTEM_USAGE_AGENCY_ID ukazuje na agentúru platiaceho zákazníka " +
      `(${SYSTEM_USAGE_AGENCY_ID}). Systémová spotreba by sa mu účtovala. ` +
      "Oprav env USAGE_SYSTEM_AGENCY_ID.",
  );
}

export type UsageMetricName =
  | "ai_openai_tokens"
  | "embedding_tokens"
  | "cron_daily_match"
  | "cron_credits_cycle"
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
