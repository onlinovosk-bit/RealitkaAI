import type { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_TRIAGE_STALE_MS = 45 * 60 * 1000;

/** UTC kalendárny deň ako YYYY-MM-DD (pre jednotný dedupe cron + worker). */
export function utcCalendarDay(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function isStaleLock(
  processingStartedAtIso: string,
  nowMs: number,
  staleMs: number,
): boolean {
  const started = new Date(processingStartedAtIso).getTime();
  if (Number.isNaN(started)) {
    return true;
  }
  return nowMs - started > staleMs;
}

const PG_UNIQUE_VIOLATION = "23505";

export async function tryClaimLeadTriage(
  admin: SupabaseClient,
  leadId: string,
  dayUtc: string,
  staleMs: number = DEFAULT_TRIAGE_STALE_MS,
): Promise<boolean> {
  const nowIso = new Date().toISOString();

  const { data: ins, error: insErr } = await admin
    .from("lead_triage_idempotency")
    .insert({
      lead_id: leadId,
      day_utc: dayUtc,
      state: "processing",
      processing_started_at: nowIso,
      updated_at: nowIso,
    })
    .select("lead_id")
    .maybeSingle();

  if (!insErr && ins) {
    return true;
  }

  if (insErr) {
    const isDup =
      insErr.code === PG_UNIQUE_VIOLATION ||
      String(insErr.message ?? "")
        .toLowerCase()
        .includes("duplicate");
    if (!isDup) {
      throw new Error(insErr.message);
    }
  }

  const { data: row, error: readErr } = await admin
    .from("lead_triage_idempotency")
    .select("state, processing_started_at")
    .eq("lead_id", leadId)
    .eq("day_utc", dayUtc)
    .maybeSingle();

  if (readErr) {
    throw new Error(readErr.message);
  }

  if (!row) {
    return false;
  }

  if (row.state === "completed") {
    return false;
  }

  const nowMs = Date.now();

  if (row.state === "failed") {
    const { data: reclaimed } = await admin
      .from("lead_triage_idempotency")
      .update({
        state: "processing",
        processing_started_at: nowIso,
        updated_at: nowIso,
      })
      .eq("lead_id", leadId)
      .eq("day_utc", dayUtc)
      .eq("state", "failed")
      .select("lead_id")
      .maybeSingle();
    return !!reclaimed;
  }

  if (row.state === "processing") {
    if (!isStaleLock(row.processing_started_at, nowMs, staleMs)) {
      return false;
    }

    const thresholdIso = new Date(nowMs - staleMs).toISOString();
    const { data: reclaimed } = await admin
      .from("lead_triage_idempotency")
      .update({
        processing_started_at: nowIso,
        updated_at: nowIso,
      })
      .eq("lead_id", leadId)
      .eq("day_utc", dayUtc)
      .eq("state", "processing")
      .lte("processing_started_at", thresholdIso)
      .select("lead_id")
      .maybeSingle();
    return !!reclaimed;
  }

  return false;
}

export async function completeLeadTriage(
  admin: SupabaseClient,
  leadId: string,
  dayUtc: string,
): Promise<boolean> {
  const nowIso = new Date().toISOString();
  const { error } = await admin
    .from("lead_triage_idempotency")
    .update({
      state: "completed",
      updated_at: nowIso,
    })
    .eq("lead_id", leadId)
    .eq("day_utc", dayUtc)
    .eq("state", "processing");

  if (error) {
    console.error("[triage idem] completeLeadTriage", leadId, error.message);
    return false;
  }
  return true;
}

export async function failLeadTriage(
  admin: SupabaseClient,
  leadId: string,
  dayUtc: string,
): Promise<boolean> {
  const nowIso = new Date().toISOString();
  const { error } = await admin
    .from("lead_triage_idempotency")
    .update({
      state: "failed",
      updated_at: nowIso,
    })
    .eq("lead_id", leadId)
    .eq("day_utc", dayUtc)
    .eq("state", "processing");

  if (error) {
    console.error("[triage idem] failLeadTriage", leadId, error.message);
    return false;
  }
  return true;
}
