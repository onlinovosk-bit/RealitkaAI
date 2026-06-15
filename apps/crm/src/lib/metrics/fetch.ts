import { createServiceRoleClient } from "@/lib/supabase/admin";
import { computeFounderMetrics } from "@/lib/metrics/compute";
import type {
  AgencyBillingRow,
  AiCostDailyRow,
  CreditLedgerRow,
  FounderMetricsSnapshot,
} from "@/lib/metrics/types";

const AGENCY_SELECT =
  "id, name, seats, account_tier, manual_plan, owner_cockpit_active, cockpit_tier, subscription_status, billing_source";

const LEDGER_LOOKBACK_DAYS = 62;

export async function fetchFounderMetrics(): Promise<FounderMetricsSnapshot | null> {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - LEDGER_LOOKBACK_DAYS);

  const [agenciesRes, ledgerRes, aiCostRes] = await Promise.all([
    supabase.from("agencies").select(AGENCY_SELECT),
    supabase
      .from("credit_ledger")
      .select("delta, reason, source, ref, created_at")
      .gte("created_at", since.toISOString()),
    supabase
      .from("ai_cost_daily")
      .select("day_utc, credits_spent, cost_eur, revenue_eur_retail, margin_eur")
      .gte("day_utc", since.toISOString().slice(0, 10))
      .order("day_utc", { ascending: false }),
  ]);

  if (agenciesRes.error) {
    console.warn("[founder-metrics] agencies:", agenciesRes.error.message);
    return null;
  }

  const ledger = (ledgerRes.error ? [] : (ledgerRes.data ?? [])) as CreditLedgerRow[];
  if (ledgerRes.error) {
    console.warn("[founder-metrics] credit_ledger:", ledgerRes.error.message);
  }

  const aiCostDailyAvailable = !aiCostRes.error;
  const aiCostDaily = (aiCostDailyAvailable ? (aiCostRes.data ?? []) : []) as AiCostDailyRow[];
  if (aiCostRes.error) {
    console.warn("[founder-metrics] ai_cost_daily:", aiCostRes.error.message);
  }

  return computeFounderMetrics({
    agencies: (agenciesRes.data ?? []) as AgencyBillingRow[],
    ledger,
    aiCostDaily,
    aiCostDailyAvailable,
  });
}
