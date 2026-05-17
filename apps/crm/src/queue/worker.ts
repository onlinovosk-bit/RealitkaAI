import type { SupabaseClient } from "@supabase/supabase-js";

import type { AiJobHandler } from "./types";
import { computeBackoffRunAfterISO } from "./backoff";
import { getQueueHandlers } from "./handlers";

export async function runAiJobsWorkerOnce(
  admin: SupabaseClient,
  options: {
    handlers?: Record<string, AiJobHandler>;
    batchSize?: number;
  } = {},
): Promise<{
  examined: number;
  completed: number;
  retried: number;
  dead: number;
  errors: string[];
}> {
  const handlers = options.handlers ?? getQueueHandlers();
  const batchSize = Math.min(Math.max(options.batchSize ?? 15, 1), 50);

  const nowIso = new Date().toISOString();

  const { data: candidates, error: selectError } = await admin
    .from("ai_jobs")
    .select(
      "id,job_type,payload,retry_count,max_retries,status,created_at,run_after",
    )
    .eq("status", "pending")
    .lte("run_after", nowIso)
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (selectError) {
    return {
      examined: 0,
      completed: 0,
      retried: 0,
      dead: 0,
      errors: [selectError.message],
    };
  }

  const rows = candidates ?? [];
  let completed = 0;
  let retried = 0;
  let dead = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const id = String(row.id);

    const claim = await admin
      .from("ai_jobs")
      .update({
        status: "processing",
        started_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", id)
      .eq("status", "pending")
      .select("id,job_type,payload,retry_count,max_retries")
      .maybeSingle();

    if (claim.error || !claim.data) {
      continue;
    }

    const jobType = String(claim.data.job_type ?? "");
    const handler = handlers[jobType];
    const payload =
      typeof claim.data.payload === "object" && claim.data.payload !== null
        ? (claim.data.payload as Record<string, unknown>)
        : {};

    if (!handler) {
      errors.push(`No handler for job_type=${jobType}`);
      if (
        await markDead(admin, id, `No handler registered for "${jobType}"`)
      ) {
        dead += 1;
      } else {
        errors.push(`${id}: could not mark job dead`);
      }
      continue;
    }

    try {
      await handler(payload);
      const ts = new Date().toISOString();
      const { error: doneErr } = await admin
        .from("ai_jobs")
        .update({
          status: "completed",
          completed_at: ts,
          updated_at: ts,
          last_error: null,
        })
        .eq("id", id)
        .eq("status", "processing");

      if (doneErr) {
        errors.push(`${id}: mark completed: ${doneErr.message}`);
      } else {
        completed += 1;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const retries = Number(claim.data.retry_count ?? 0) + 1;
      const maxRetries = Number(claim.data.max_retries ?? 5);
      const ts = new Date().toISOString();

      if (retries >= maxRetries) {
        const { error: deadErr } = await admin
          .from("ai_jobs")
          .update({
            status: "dead",
            retry_count: retries,
            last_error: msg,
            updated_at: ts,
            completed_at: ts,
          })
          .eq("id", id)
          .eq("status", "processing");

        if (deadErr) {
          errors.push(`${id}: mark dead: ${deadErr.message}`);
        } else {
          dead += 1;
        }
      } else {
        const { error: pendErr } = await admin
          .from("ai_jobs")
          .update({
            status: "pending",
            retry_count: retries,
            last_error: msg,
            run_after: computeBackoffRunAfterISO(retries),
            updated_at: ts,
          })
          .eq("id", id)
          .eq("status", "processing");

        if (pendErr) {
          errors.push(`${id}: mark retry: ${pendErr.message}`);
        } else {
          retried += 1;
        }
      }
      errors.push(`${id}: ${msg}`);
    }
  }

  return {
    examined: rows.length,
    completed,
    retried,
    dead,
    errors: errors.slice(0, 20),
  };
}

async function markDead(
  admin: SupabaseClient,
  id: string,
  message: string,
): Promise<boolean> {
  const ts = new Date().toISOString();
  const { error } = await admin
    .from("ai_jobs")
    .update({
      status: "dead",
      last_error: message,
      updated_at: ts,
      completed_at: ts,
    })
    .eq("id", id)
    .eq("status", "processing");

  if (error) {
    console.error("[ai_jobs] markDead", id, error.message);
    return false;
  }
  return true;
}
