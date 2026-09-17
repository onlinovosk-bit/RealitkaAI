// api/scheduled-outreach.ts
// Serverless handler for scheduled outreach (Vercel/Netlify cron)
import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronBearer } from "@/lib/cron-auth";
import { listLeadsAsService } from "@/lib/leads-store";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { runOutreachSequence } from "@/scripts/outreach-automation-2.0";

/**
 * Automatic sending to prospects stays opt-in.
 *
 * House rule: drafts always, automatic send to prospects never without human
 * approval. The lead lookup below is now correct, so flipping this flag really
 * does start sending — keep it unset until the founder approves the run.
 */
export function isScheduledOutreachEnabled(
  env: NodeJS.Dict<string> = process.env,
): boolean {
  return env.SCHEDULED_OUTREACH_ENABLED?.trim().toLowerCase() === "true";
}

export async function POST(req: NextRequest) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  if (!isAuthorizedCronBearer(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isScheduledOutreachEnabled()) {
    return NextResponse.json({
      ok: true,
      enabled: false,
      scanned: 0,
      attempted: 0,
      sent: 0,
      failed: 0,
      reason:
        "SCHEDULED_OUTREACH_ENABLED nie je 'true' — automatický send prospektom je vypnutý.",
    });
  }

  // Cron has no user session. Without an explicit service-role client every
  // lead read resolves to the browser singleton and returns zero rows, which
  // used to make this endpoint report ok:true after doing nothing at all.
  const serviceClient = createServiceRoleClient();
  if (!serviceClient) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "SUPABASE_SERVICE_ROLE_KEY chýba — cron nevie čítať leady bez session. Beh zastavený (predtým tichý no-op).",
      },
      { status: 500 },
    );
  }

  let leads;
  try {
    leads = await listLeadsAsService(serviceClient, { withEmailOnly: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "listLeadsAsService failed",
      },
      { status: 500 },
    );
  }

  let sent = 0;
  let failed = 0;
  const errors: Array<{ leadId: string; error: string }> = [];

  for (const lead of leads) {
    try {
      await runOutreachSequence(lead.id, serviceClient);
      sent += 1;
    } catch (error) {
      failed += 1;
      errors.push({
        leadId: lead.id,
        error: error instanceof Error ? error.message : "unknown error",
      });
    }
  }

  return NextResponse.json({
    ok: failed === 0,
    enabled: true,
    scanned: leads.length,
    attempted: leads.length,
    sent,
    failed,
    ...(errors.length > 0 ? { errors: errors.slice(0, 20) } : {}),
  });
}
