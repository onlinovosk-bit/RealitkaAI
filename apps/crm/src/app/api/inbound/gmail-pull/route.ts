import { NextRequest } from "next/server";
import { errorResponse, okResponse } from "@/lib/api-response";
import { incrementUsageMetric, SYSTEM_USAGE_AGENCY_ID } from "@/lib/usage-metrics";
import { runGmailInboundPullAll } from "@/lib/inbound/gmail-pull";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { cronHttpStatus, deriveCronStatus, recordCronRun } from "@/lib/ops/cron-run";

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

  // Trvalá stopa iba keď sa niečo stalo. Beh každých pár minút bez nových správ by
  // zaplavil cron_runs; "nič nové" je pri vypnutom alebo tichom štítku normálny stav.
  // Zlyhanie (napr. oauth_refresh_failed:invalid_grant) sa loguje vždy — je to jediný signál,
  // že token vypršal a dopyty prestali chodiť.
  const touched = !result.ok || result.pulled > 0 || result.errors.length > 0;
  const sb = result.ok && result.skipped ? null : touched ? createServiceRoleClient() : null;
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
