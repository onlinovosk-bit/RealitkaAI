import type { SupabaseClient } from "@supabase/supabase-js";

export type TriageLockStatsSnapshot = {
  acquired_insert: number;
  acquired_after_failed: number;
  acquired_stale_recovery: number;
  skipped_completed: number;
  skipped_lock_held: number;
  skipped_race_or_missing: number;
};

export type TriageAgencyMetricSlice = {
  agency_id: string;
  candidates_in_run_for_agency: number;
  claimed_for_agency: number;
  updated_for_agency: number;
  ai_api_fallback_leads: number;
};

/**
 * Best-effort persist — nepresmeruje výsledok triáže pri chybe zápisu.
 */
export async function insertTriageRunMetricRows(
  admin: SupabaseClient,
  args: {
    run_id: string;
    source: string;
    day_utc: string;
    started_at: string;
    finished_at: string;
    duration_ms: number;
    outcome: "success" | "error" | "no_claims";
    candidate_count: number;
    skipped_dupe: number;
    lock: TriageLockStatsSnapshot;
    error_message?: string | null;
    per_agency: TriageAgencyMetricSlice[];
  },
): Promise<void> {
  const slices = args.per_agency.filter((s) => s.agency_id && s.agency_id !== "_unknown");
  if (slices.length === 0) {
    return;
  }

  const rows = slices.map((a) => ({
    run_id: args.run_id,
    source: args.source,
    day_utc: args.day_utc,
    agency_id: a.agency_id,
    started_at: args.started_at,
    finished_at: args.finished_at,
    duration_ms: args.duration_ms,
    outcome: args.outcome,
    candidate_count: args.candidate_count,
    candidates_in_run_for_agency: a.candidates_in_run_for_agency,
    claimed_for_agency: a.claimed_for_agency,
    updated_for_agency: a.updated_for_agency,
    skipped_dupe_global: args.skipped_dupe,
    lock_acquired_insert: args.lock.acquired_insert,
    lock_acquired_after_failed: args.lock.acquired_after_failed,
    lock_stale_recovery: args.lock.acquired_stale_recovery,
    lock_skipped_completed: args.lock.skipped_completed,
    lock_skipped_lock_held: args.lock.skipped_lock_held,
    lock_skipped_race_or_missing: args.lock.skipped_race_or_missing,
    ai_api_fallback_leads: a.ai_api_fallback_leads,
    error_message: args.error_message ?? null,
  }));

  const { error } = await admin.from("ai_triage_run_metrics").insert(rows);
  if (error) {
    console.error("[ai_triage] insertTriageRunMetricRows", error.message);
  }
}
