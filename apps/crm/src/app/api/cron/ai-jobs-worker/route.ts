/**
 * DB queue worker — Vercel Cron (CRON_SECRET). Polls ai_jobs, runs registered handlers.
 */
import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/server";
import { runAiJobsWorkerOnce } from "@/queue/worker";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const batch = Math.min(
    Number(process.env.AI_JOBS_BATCH_SIZE ?? "15"),
    50,
  );

  const summary = await runAiJobsWorkerOnce(admin, { batchSize: batch });

  return NextResponse.json({ ok: true, ...summary });
}
