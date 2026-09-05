import { NextRequest, NextResponse } from "next/server";
import { runUnreadNotificationDigest } from "@/lib/infra/notification-delivery";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/notification-digest — Strážca prítoku daily delivery.
 * Unread routine_notifications → FOUNDER_EMAILS; mark read_at after send.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const result = await runUnreadNotificationDigest(supabase);

  return NextResponse.json({
    ok: true,
    ...result,
    generated_at: new Date().toISOString(),
  });
}
