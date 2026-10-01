import { createServiceRoleClient } from "@/lib/supabase/admin";
import { logInfo, logError } from "@/lib/logger";
import { isAdvertPayload } from "./types";

export type ReconcileResult = {
  scanned: number;
  matched: number;
  updated: number;
  skipped: number;
  errors: string[];
};

function extractSourceId(payload: unknown): string | null {
  if (!isAdvertPayload(payload)) return null;
  const id = payload.advert?.source_id;
  if (id == null) return null;
  return String(id);
}

/**
 * Mark webhook logs processed=true ONLY when a matching property exists (source_id + agency).
 * Never blind-updates all rows.
 */
export async function reconcileWebhookProcessedFlags(
  options: { agencyId?: string; limit?: number } = {},
): Promise<ReconcileResult> {
  const sb = createServiceRoleClient();
  const result: ReconcileResult = {
    scanned: 0,
    matched: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  if (!sb) {
    result.errors.push("DB client unavailable");
    return result;
  }

  const limit = Math.min(options.limit ?? 200, 500);

  let query = sb
    .from("realvia_webhook_logs")
    .select("id, agency_id, payload_json")
    .eq("processed", false)
    .limit(limit);

  if (options.agencyId) {
    query = query.eq("agency_id", options.agencyId);
  }

  const { data: logs, error } = await query;

  if (error) {
    result.errors.push(error.message);
    return result;
  }

  for (const log of logs ?? []) {
    result.scanned++;
    const agencyId = log.agency_id ?? options.agencyId;
    if (!agencyId) {
      result.skipped++;
      continue;
    }

    const sourceId = extractSourceId(log.payload_json);
    if (!sourceId) {
      result.skipped++;
      continue;
    }

    const { data: property, error: propErr } = await sb
      .from("properties")
      .select("id")
      .eq("source_id", sourceId)
      .eq("agency_id", agencyId)
      .maybeSingle();

    if (propErr) {
      result.errors.push(`${log.id}: ${propErr.message}`);
      continue;
    }

    if (!property?.id) {
      result.skipped++;
      continue;
    }

    result.matched++;

    const { error: updErr } = await sb
      .from("realvia_webhook_logs")
      .update({ processed: true, processing_error: null })
      .eq("id", log.id);

    if (updErr) {
      result.errors.push(`${log.id}: ${updErr.message}`);
    } else {
      result.updated++;
    }
  }

  logInfo("[realvia-reconcile] Webhook processed flags reconciled", result);
  return result;
}

/** Called after successful queue job — ensures flag set when property upsert succeeded. */
export async function markWebhookProcessedIfPropertyExists(
  webhookLogId: string,
  agencyId: string,
  sourceId: string,
): Promise<boolean> {
  const sb = createServiceRoleClient();
  if (!sb) return false;

  const { data: property } = await sb
    .from("properties")
    .select("id")
    .eq("source_id", sourceId)
    .eq("agency_id", agencyId)
    .maybeSingle();

  if (!property?.id) return false;

  const { error } = await sb
    .from("realvia_webhook_logs")
    .update({ processed: true, processing_error: null })
    .eq("id", webhookLogId);

  if (error) {
    logError("[realvia-reconcile] mark processed failed", { webhookLogId, error: error.message });
    return false;
  }
  return true;
}
