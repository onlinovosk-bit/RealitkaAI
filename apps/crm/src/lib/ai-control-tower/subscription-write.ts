import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  validateManualSnapshot,
  type ManualSnapshotInput,
  type ValidatedManualSnapshot,
} from "@revolis/model-gateway/subscription-capacity";

export type SnapshotWriteResult =
  | { ok: true; snapshot: ValidatedManualSnapshot; inserted: boolean }
  | { ok: false; error: string; status: number };

export async function writeManualSubscriptionSnapshot(
  input: ManualSnapshotInput,
): Promise<SnapshotWriteResult> {
  const parsed = validateManualSnapshot(input);
  if (!parsed.ok) return { ok: false, error: parsed.error, status: 400 };

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "Zápis nie je nakonfigurovaný.", status: 503 };
  }

  const value = parsed.value;
  const { error: poolError } = await supabase.from("ai_quota_pools").upsert(
    {
      id: value.poolId,
      provider: value.provider,
      account_ref: value.accountRef,
      quota_window: value.quotaWindow,
    },
    { onConflict: "id" },
  );
  if (poolError) {
    return { ok: false, error: "Pool sa nepodarilo uložiť.", status: 500 };
  }

  const row = {
    pool_id: value.poolId,
    provider: value.provider,
    account_ref: value.accountRef,
    quota_window: value.quotaWindow,
    source: value.source,
    used_percent: value.usedPercent,
    remaining_percent: value.remainingPercent,
    reset_at: value.resetAt,
    reset_timezone: value.resetTimezone,
    captured_at: value.capturedAt,
    updated_at: value.capturedAt,
    note: value.note,
    limit_eur: null,
    consumed_eur: null,
  };

  const { error: insertError } = await supabase.from("ai_quota_snapshots").insert(row);
  if (insertError) {
    const code = typeof insertError.code === "string" ? insertError.code : "";
    if (code === "23505") {
      const { error: updateError } = await supabase
        .from("ai_quota_snapshots")
        .update({
          used_percent: value.usedPercent,
          remaining_percent: value.remainingPercent,
          reset_at: value.resetAt,
          reset_timezone: value.resetTimezone,
          updated_at: value.capturedAt,
          note: value.note,
          source: value.source,
        })
        .eq("pool_id", value.poolId)
        .eq("captured_at", value.capturedAt);
      if (updateError) {
        return { ok: false, error: "Snímok sa nepodarilo aktualizovať.", status: 500 };
      }
      return { ok: true, snapshot: value, inserted: false };
    }
    return { ok: false, error: "Snímok sa nepodarilo uložiť.", status: 500 };
  }

  return { ok: true, snapshot: value, inserted: true };
}
