import { NextRequest } from "next/server";
import { errorResponse, okResponse } from "@/lib/api-response";
import { incrementUsageMetric, SYSTEM_USAGE_AGENCY_ID } from "@/lib/usage-metrics";
import { runGmailInboundPullAll } from "@/lib/inbound/gmail-pull";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  cronHttpStatus,
  deriveCronStatus,
  recordCronRun,
  recordSkippedCronRun,
} from "@/lib/ops/cron-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected || req.headers.get("authorization") !== `Bearer ${expected}`) {
    return errorResponse("unauthorized", 401);
  }

  await incrementUsageMetric({
    agencyId: SYSTEM_USAGE_AGENCY_ID,
    metric: "ai_openai_tokens",
    delta: 0,
  });

  const startedAt = new Date();
  const result = await runGmailInboundPullAll({ fetch });

  // Trvalá stopa iba keď sa niečo stalo. Beh bez nových správ by zbytočne
  // plnil cron_runs; "nič nové" je pri tichom štítku normálny stav.
  // Zlyhanie (napr. oauth_refresh_failed:invalid_grant) sa loguje vždy — je to jediný signál,
  // že token vypršal a dopyty prestali chodiť.
  //
  // Preskočený beh (chýbajúca konfigurácia) sa od 2026-10-15 zapisuje tiež, ale
  // najviac raz za 12 hodín: odkedy je pull v rozvrhu (`20 8 * * *`), je rozdiel
  // medzi "Vercel to nespúšťa" a "spúšťa a chýba mu refresh token" jediná vec,
  // ktorú z prázdnej tabuľky nešlo prečítať.
  const touched = !result.ok || result.pulled > 0 || result.errors.length > 0;
  const skippedReason = result.ok ? result.skipped ?? null : null;
  if (skippedReason) {
    const skipClient = createServiceRoleClient();
    if (skipClient) await recordSkippedCronRun(skipClient, "gmail-inbound-pull", skippedReason);
    return okResponse(result);
  }
  const sb = touched ? createServiceRoleClient() : null;
  let logError: string | null = null;
  if (sb) {
    logError = result.ok
      ? await recordCronRun(sb, {
          job: "gmail-inbound-pull",
          status: deriveCronStatus(result.pulled, result.posted, result.errors.length),
          scanned: result.pulled + result.alreadySeen,
          eligible: result.pulled,
          written: result.posted,
          failed: result.errors.length,
          firstError: result.errors[0] ?? null,
          detail: { agencies: result.agencies, outsideLabel: result.outsideLabel, alreadySeen: result.alreadySeen },
          startedAt,
        })
      : await recordCronRun(sb, {
          job: "gmail-inbound-pull",
          status: "failed",
          failed: 1,
          firstError: result.error,
          startedAt,
        });
  }

  if (!result.ok) {
    return errorResponse(result.error, cronHttpStatus("failed", logError) === 500 ? 500 : 503);
  }
  return okResponse(result);
}

export const GET = handle;
export const POST = handle;
