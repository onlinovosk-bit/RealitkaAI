import { NextRequest, NextResponse } from "next/server";
import { revolisGuard } from "@/lib/revolis-guard";
import { createAdminClient } from "@/lib/supabase/server";
import { runDealTrigger } from "@/lib/agents/deal-trigger";

async function executeTrigger() {
  const admin = createAdminClient();
  const result = await runDealTrigger(admin);
  return NextResponse.json(result);
}

function authorizeCronBearer(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return req.headers.get("authorization") === `Bearer ${cronSecret}`;
}

/** HMAC auth — internal / Revolis Guard callers */
export async function GET(req: NextRequest) {
  return revolisGuard(req, "Strážca Cien a Ziskov", executeTrigger);
}

/** Bearer CRON_SECRET — smoke / Vercel cron */
export async function POST(req: NextRequest) {
  if (!authorizeCronBearer(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return await executeTrigger();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[deal-trigger]", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
