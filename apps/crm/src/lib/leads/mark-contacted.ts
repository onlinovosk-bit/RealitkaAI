import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Stamps `leads.last_contact_at` when we demonstrably reached the lead.
 *
 * WHY THIS EXISTS
 *
 * Ten surfaces read `leads.last_contact_at` — AiInsightsPanel, dead-lead
 * campaign, rescue trigger, daily actions, call-script, sales-brain,
 * deal-strategy, dashboard summary — and nothing in the repository ever wrote
 * it. Measured on production 2026-10-02: 0 of 520 rows carry a value. Every
 * one of those surfaces has therefore been reading a column that is NULL for
 * the entire book, and #735 had to report "nemerané" in the morning brief for
 * exactly this reason.
 *
 * WHAT COUNTS AS CONTACT
 *
 * Only an outbound message that the transport confirmed as sent. Not a draft,
 * not a failed send, not an AI scoring pass, not a pipeline move. The two live
 * paths are the inbound auto-response and a human-approved AI reply; both call
 * this only after their send returned ok.
 *
 * MONOTONIC BY DESIGN
 *
 * The update is guarded so the stamp never moves backwards. Sends are not
 * ordered — a retry, a queued job, or a backfill can arrive with an older
 * timestamp than one already stored, and "last contact" that rewinds would
 * resurrect a lead into a staleness report it had already left.
 *
 * FAIL-SOFT, DELIBERATELY
 *
 * The e-mail has already left when this runs. A failed stamp must not turn a
 * delivered message into a reported failure, so the error is logged and
 * swallowed. The caller's send result is the source of truth about delivery;
 * this function only records it.
 */
export interface MarkLeadContactedResult {
  /** True when a row was stamped. False when nothing changed (older timestamp, unknown lead) or the write failed. */
  stamped: boolean;
  /** Present when the write itself failed, so callers can log with their own prefix. */
  error?: string;
}

export async function markLeadContacted(
  admin: SupabaseClient,
  leadId: string,
  atIso: string,
): Promise<MarkLeadContactedResult> {
  const { data, error } = await admin
    .from("leads")
    .update({ last_contact_at: atIso })
    .eq("id", leadId)
    // Monotonic: only move the stamp forward. PostgREST `or` over a null check
    // and a comparison — a NULL column fails `lt` on its own, so the null
    // branch is what lets the first stamp through.
    .or(`last_contact_at.is.null,last_contact_at.lt.${atIso}`)
    .select("id");

  if (error) {
    console.error("[markLeadContacted]", leadId, error.message);
    return { stamped: false, error: error.message };
  }

  return { stamped: (data?.length ?? 0) > 0 };
}
