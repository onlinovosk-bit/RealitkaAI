import type { SupabaseClient } from "@supabase/supabase-js";

import { triageLeadBatches, type TriageLeadInput } from "@/lib/ai/lead-triage-batch";
import {
  completeLeadTriage,
  DEFAULT_TRIAGE_STALE_MS,
  failLeadTriage,
  tryClaimLeadTriage,
  utcCalendarDay,
} from "@/ai/triage-idempotency";

export type LeadRowForTriage = {
  id: string;
  name: string;
  status: string;
  score: number;
  last_contact: string | null;
  note: string | null;
  source: string | null;
  ai_priority_manual_at: string | null;
};

function toInput(r: LeadRowForTriage): TriageLeadInput {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    status: String(r.status ?? ""),
    score: Number(r.score ?? 0),
    last_contact: r.last_contact ?? "",
    note: r.note ?? "",
    source: r.source ?? "",
  };
}

/** Claim → Haiku batch → zápis leads + complete/fail idempotency (zdieľané cron + worker). */
export async function executeTriageWithIdempotency(
  admin: SupabaseClient,
  candidates: LeadRowForTriage[],
): Promise<{
  processed: number;
  updated: number;
  skipped_dupe: number;
  triaged_at: string;
}> {
  const dayUtc = utcCalendarDay();
  const envStale = process.env.TRIAGE_LOCK_STALE_MS;
  const parsed = envStale ? Number(envStale) : DEFAULT_TRIAGE_STALE_MS;
  const staleMs =
    Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TRIAGE_STALE_MS;

  let skipped_dupe = 0;
  const claimed: TriageLeadInput[] = [];
  const claimedIds: string[] = [];

  for (const r of candidates) {
    const id = String(r.id);
    const ok = await tryClaimLeadTriage(admin, id, dayUtc, staleMs);
    if (!ok) {
      skipped_dupe += 1;
      continue;
    }
    claimedIds.push(id);
    claimed.push(toInput(r));
  }

  const triagedAt = new Date().toISOString();

  if (claimed.length === 0) {
    return {
      processed: 0,
      updated: 0,
      skipped_dupe,
      triaged_at: triagedAt,
    };
  }

  try {
    const results = await triageLeadBatches(claimed);
    const resultIds = new Set(results.map((x) => x.lead_id));
    let updated = 0;

    for (const row of results) {
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
        const idemOk = await completeLeadTriage(admin, row.lead_id, dayUtc);
        if (!idemOk) {
          await failLeadTriage(admin, row.lead_id, dayUtc);
        }
      } else {
        await failLeadTriage(admin, row.lead_id, dayUtc);
      }
    }

    for (const id of claimedIds) {
      if (!resultIds.has(id)) {
        await failLeadTriage(admin, id, dayUtc);
      }
    }

    return {
      processed: claimed.length,
      updated,
      skipped_dupe,
      triaged_at: triagedAt,
    };
  } catch (e) {
    await Promise.all(
      claimedIds.map((id) => failLeadTriage(admin, id, dayUtc)),
    );
    throw e;
  }
}
