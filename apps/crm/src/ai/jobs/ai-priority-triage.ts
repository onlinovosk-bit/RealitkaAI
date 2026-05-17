/**
 * Queue handler: Haiku batch triáž pre explicitný zoznam lead_id (reuse W1 pipeline).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { executeTriageWithIdempotency } from "@/ai/triage-with-idempotency";
import { createAdminClient } from "@/lib/supabase/server";
import { AI_JOB_TYPES } from "@/queue/types";
import { enqueueAiJob } from "@/queue/enqueue";

const OPEN_STATUSES = new Set([
  "Nový",
  "Teplý",
  "Horúci",
  "Obhliadka",
  "Ponuka",
]);

export function parseAiPriorityTriagePayload(
  payload: Record<string, unknown>,
): string[] {
  const raw = payload.lead_ids;
  if (!Array.isArray(raw)) {
    throw new Error("payload.lead_ids must be an array");
  }
  const ids = raw.filter((x): x is string => typeof x === "string" && x.length > 0);
  if (ids.length === 0) {
    throw new Error("payload.lead_ids must contain at least one id");
  }
  return ids;
}

export async function executeAiPriorityTriageJob(
  payload: Record<string, unknown>,
): Promise<void> {
  const leadIds = parseAiPriorityTriagePayload(payload);
  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from("leads")
    .select(
      "id,name,status,score,last_contact,note,source,ai_priority_manual_at",
    )
    .in("id", leadIds);

  if (error) {
    throw new Error(error.message);
  }

  const list = (rows ?? []).filter(
    (r) =>
      OPEN_STATUSES.has(String(r.status ?? "")) &&
      r.ai_priority_manual_at == null,
  );

  if (list.length === 0) {
    return;
  }

  await executeTriageWithIdempotency(admin, list);
}

export async function enqueueAiPriorityTriage(
  admin: SupabaseClient,
  lead_ids: string[],
): Promise<{ id: string } | { error: string }> {
  return enqueueAiJob(admin, {
    jobType: AI_JOB_TYPES.AI_PRIORITY_TRIAGE,
    payload: { lead_ids } satisfies Record<string, unknown>,
    maxRetries: 5,
  });
}
