import type { SupabaseClient } from "@supabase/supabase-js";

import { executeTriageLeadBatchesWithLogging } from "@/ai/triage-lead-batches-execute";
import {
  completeLeadTriage,
  DEFAULT_TRIAGE_STALE_MS,
  failLeadTriage,
  tryClaimLeadTriage,
  utcCalendarDay,
} from "@/ai/triage-idempotency";
import type { TriageLeadInput } from "@/lib/ai/lead-triage-batch";
import { insertTriageRunMetricRows } from "@/ai/triage-run-metrics";
import { logAiTriage } from "@/logger/ai-triage-log";

export type LeadRowForTriage = {
  id: string;
  name: string;
  status: string;
  score: number;
  budget: string | null;
  last_contact: string | null;
  note: string | null;
  source: string | null;
  ai_priority_manual_at: string | null;
};

export type TriageExecutionSource = "cron_lead_ai_triage" | "ai_jobs_queue";

export type TriageRunOptions = {
  source?: TriageExecutionSource;
};

function toInput(r: LeadRowForTriage): TriageLeadInput {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    status: String(r.status ?? ""),
    score: Number(r.score ?? 0),
    budget: r.budget ?? "",
    last_contact: r.last_contact ?? "",
    note: r.note ?? "",
    source: r.source ?? "",
  };
}

function newRunId(): string {
  return `triage_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

async function fetchAgencyByLeadIds(
  admin: SupabaseClient,
  leadIds: string[],
): Promise<Map<string, string>> {
  if (leadIds.length === 0) {
    return new Map();
  }
  const { data, error } = await admin
    .from("leads")
    .select("id,agency_id")
    .in("id", leadIds);
  if (error) {
    throw new Error(error.message);
  }
  const m = new Map<string, string>();
  for (const row of data ?? []) {
    m.set(String(row.id), row.agency_id != null ? String(row.agency_id) : "");
  }
  return m;
}

function histogramByTenant(ids: string[], agencies: Map<string, string>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of ids) {
    const t = agencies.get(id);
    const key = t && t.length > 0 ? t : "_unknown";
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

/** Claim → Haiku batch → zápis leads + complete/fail idempotency (zdieľané cron + worker). */
export async function executeTriageWithIdempotency(
  admin: SupabaseClient,
  candidates: LeadRowForTriage[],
  options: TriageRunOptions = {},
): Promise<{
  processed: number;
  updated: number;
  skipped_dupe: number;
  triaged_at: string;
}> {
  const source = options.source ?? "cron_lead_ai_triage";
  const runId = newRunId();
  const wallStart = Date.now();
  const startedAtIso = new Date(wallStart).toISOString();

  const dayUtc = utcCalendarDay();
  const envStale = process.env.TRIAGE_LOCK_STALE_MS;
  const parsed = envStale ? Number(envStale) : DEFAULT_TRIAGE_STALE_MS;
  const staleMs =
    Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TRIAGE_STALE_MS;

  const lockStats = {
    acquired_insert: 0,
    acquired_after_failed: 0,
    acquired_stale_recovery: 0,
    skipped_completed: 0,
    skipped_lock_held: 0,
    skipped_race_or_missing: 0,
  };

  let skipped_dupe = 0;
  const claimed: TriageLeadInput[] = [];
  const claimedIds: string[] = [];

  logAiTriage({
    event: "ai_triage_run_start",
    run_id: runId,
    source,
    day_utc: dayUtc,
    stale_lock_ms: staleMs,
    started_at: startedAtIso,
    candidate_count: candidates.length,
  });

  for (const r of candidates) {
    const id = String(r.id);
    const claim = await tryClaimLeadTriage(admin, id, dayUtc, staleMs);
    if (claim.ok) {
      if (claim.path === "insert") lockStats.acquired_insert += 1;
      else if (claim.path === "reclaim_failed") lockStats.acquired_after_failed += 1;
      else lockStats.acquired_stale_recovery += 1;
      claimedIds.push(id);
      claimed.push(toInput(r));
      continue;
    }
    skipped_dupe += 1;
    if (claim.reason === "already_completed") lockStats.skipped_completed += 1;
    else if (claim.reason === "lock_held") lockStats.skipped_lock_held += 1;
    else lockStats.skipped_race_or_missing += 1;
  }

  logAiTriage({
    event: "ai_triage_lock_phase",
    run_id: runId,
    source,
    day_utc: dayUtc,
    duration_ms: Date.now() - wallStart,
    candidate_count: candidates.length,
    claimed_count: claimedIds.length,
    skipped_dupe,
    lock: lockStats,
    stale_lock_ms: staleMs,
  });

  const candIdsAll = candidates.map((c) => String(c.id));
  let candidatesByAgency: Record<string, number> = {};
  if (candIdsAll.length > 0) {
    const candAgMap = await fetchAgencyByLeadIds(admin, candIdsAll);
    candidatesByAgency = histogramByTenant(candIdsAll, candAgMap);
  }

  const triagedAt = new Date().toISOString();

  if (claimedIds.length === 0) {
    logAiTriage({
      event: "ai_triage_run_end",
      run_id: runId,
      source,
      day_utc: dayUtc,
      started_at: startedAtIso,
      finished_at: triagedAt,
      duration_ms: Date.now() - wallStart,
      candidate_count: candidates.length,
      lead_count: 0,
      processed: 0,
      updated: 0,
      skipped_dupe,
      lock: lockStats,
      outcome: "no_claims",
    });
    await insertTriageRunMetricRows(admin, {
      run_id: runId,
      source,
      day_utc: dayUtc,
      started_at: startedAtIso,
      finished_at: triagedAt,
      duration_ms: Date.now() - wallStart,
      outcome: "no_claims",
      candidate_count: candidates.length,
      skipped_dupe,
      lock: lockStats,
      per_agency: Object.keys(candidatesByAgency)
        .filter((k) => k !== "_unknown")
        .map((agency_id) => ({
          agency_id,
          candidates_in_run_for_agency: candidatesByAgency[agency_id] ?? 0,
          claimed_for_agency: 0,
          updated_for_agency: 0,
          ai_api_fallback_leads: 0,
        })),
    });
    return {
      processed: 0,
      updated: 0,
      skipped_dupe,
      triaged_at: triagedAt,
    };
  }

  const agencyByLead = await fetchAgencyByLeadIds(admin, claimedIds);
  const byTenant = histogramByTenant(claimedIds, agencyByLead);
  const agencyStats = new Map<string, { updated: number; apiFallback: number }>();

  let updated = 0;
  let idemCompleteOk = 0;
  let idemCompleteMiss = 0;
  let idemFailOk = 0;
  let idemFailMiss = 0;

  try {
    const results = await executeTriageLeadBatchesWithLogging(claimed, {
      run_id: runId,
      source,
      by_tenant: byTenant,
    });
    const resultIds = new Set(results.map((x) => x.lead_id));

    for (const row of results) {
      const ag = agencyByLead.get(row.lead_id) ?? "_unknown";
      const { error: upErr } = await admin
        .from("leads")
        .update({
          ai_priority: row.priority,
          ai_reason: row.reason,
          ai_triage_at: triagedAt,
        })
        .eq("id", row.lead_id);

      if (!upErr) {
        updated += 1;
        if (ag !== "_unknown") {
          const st = agencyStats.get(ag) ?? { updated: 0, apiFallback: 0 };
          st.updated += 1;
          if (row.reason.includes("AI volanie zlyhalo")) {
            st.apiFallback += 1;
          }
          agencyStats.set(ag, st);
        }
        const idemOk = await completeLeadTriage(admin, row.lead_id, dayUtc);
        if (idemOk) idemCompleteOk += 1;
        else {
          idemCompleteMiss += 1;
          const fOk = await failLeadTriage(admin, row.lead_id, dayUtc);
          if (fOk) idemFailOk += 1;
          else idemFailMiss += 1;
        }
      } else {
        const fOk = await failLeadTriage(admin, row.lead_id, dayUtc);
        if (fOk) idemFailOk += 1;
        else idemFailMiss += 1;
      }
    }

    for (const id of claimedIds) {
      if (!resultIds.has(id)) {
        const fOk = await failLeadTriage(admin, id, dayUtc);
        if (fOk) idemFailOk += 1;
        else idemFailMiss += 1;
      }
    }

    const finishedAt = new Date().toISOString();
    logAiTriage({
      event: "ai_triage_run_end",
      run_id: runId,
      source,
      day_utc: dayUtc,
      started_at: startedAtIso,
      finished_at: finishedAt,
      duration_ms: Date.now() - wallStart,
      candidate_count: candidates.length,
      lead_count: claimed.length,
      tenant_ids: Object.keys(byTenant),
      by_tenant: byTenant,
      processed: claimed.length,
      updated,
      skipped_dupe,
      lock: lockStats,
      idempotency: {
        complete_ok: idemCompleteOk,
        complete_miss: idemCompleteMiss,
        fail_mark_ok: idemFailOk,
        fail_mark_miss: idemFailMiss,
      },
      outcome: "success",
    });

    const agencyKeys = new Set<string>();
    for (const k of Object.keys(candidatesByAgency)) {
      if (k !== "_unknown") agencyKeys.add(k);
    }
    for (const k of Object.keys(byTenant)) {
      if (k !== "_unknown") agencyKeys.add(k);
    }
    await insertTriageRunMetricRows(admin, {
      run_id: runId,
      source,
      day_utc: dayUtc,
      started_at: startedAtIso,
      finished_at: finishedAt,
      duration_ms: Date.now() - wallStart,
      outcome: "success",
      candidate_count: candidates.length,
      skipped_dupe,
      lock: lockStats,
      per_agency: [...agencyKeys].map((agency_id) => ({
        agency_id,
        candidates_in_run_for_agency: candidatesByAgency[agency_id] ?? 0,
        claimed_for_agency: byTenant[agency_id] ?? 0,
        updated_for_agency: agencyStats.get(agency_id)?.updated ?? 0,
        ai_api_fallback_leads: agencyStats.get(agency_id)?.apiFallback ?? 0,
      })),
    });

    return {
      processed: claimed.length,
      updated,
      skipped_dupe,
      triaged_at: triagedAt,
    };
  } catch (e) {
    await Promise.all(claimedIds.map((id) => failLeadTriage(admin, id, dayUtc)));
    const msg = e instanceof Error ? e.message : String(e);
    const finishedAt = new Date().toISOString();
    logAiTriage({
      event: "ai_triage_run_end",
      run_id: runId,
      source,
      day_utc: dayUtc,
      started_at: startedAtIso,
      finished_at: finishedAt,
      duration_ms: Date.now() - wallStart,
      candidate_count: candidates.length,
      lead_count: claimed.length,
      tenant_ids: Object.keys(byTenant),
      by_tenant: byTenant,
      processed: claimed.length,
      updated,
      skipped_dupe,
      lock: lockStats,
      outcome: "error",
      error: msg.slice(0, 800),
    });
    const agencyKeysErr = new Set<string>();
    for (const k of Object.keys(candidatesByAgency)) {
      if (k !== "_unknown") agencyKeysErr.add(k);
    }
    for (const k of Object.keys(byTenant)) {
      if (k !== "_unknown") agencyKeysErr.add(k);
    }
    await insertTriageRunMetricRows(admin, {
      run_id: runId,
      source,
      day_utc: dayUtc,
      started_at: startedAtIso,
      finished_at: finishedAt,
      duration_ms: Date.now() - wallStart,
      outcome: "error",
      candidate_count: candidates.length,
      skipped_dupe,
      lock: lockStats,
      error_message: msg.slice(0, 800),
      per_agency: [...agencyKeysErr].map((agency_id) => ({
        agency_id,
        candidates_in_run_for_agency: candidatesByAgency[agency_id] ?? 0,
        claimed_for_agency: byTenant[agency_id] ?? 0,
        updated_for_agency: agencyStats.get(agency_id)?.updated ?? 0,
        ai_api_fallback_leads: agencyStats.get(agency_id)?.apiFallback ?? 0,
      })),
    });
    throw e;
  }
}
