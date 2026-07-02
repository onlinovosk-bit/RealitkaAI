export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { buildPreDemoBriefText, parseUtmFromBooking } from "@/lib/demo-ops/brief-builder";
import { sendDemoOpsEmail } from "@/lib/demo-ops/send-ops-email";

const HORIZON_MS = 36 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const until = new Date(now + HORIZON_MS).toISOString();
  const admin = createAdminClient();

  const { data: bookings, error } = await admin
    .from("demo_bookings")
    .select(
      `id, invitee_name, invitee_email, scheduled_at, unknown_prospect,
       utm_source, utm_medium, utm_campaign, utm_content, utm_term,
       demo_prospects ( nazov, mesto, kraj, icp_score, team_size_estimate, portals_detected )`,
    )
    .is("brief_sent_at", null)
    .gte("scheduled_at", new Date(now).toISOString())
    .lte("scheduled_at", until);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const b of bookings ?? []) {
    const prospectRaw = b.demo_prospects as
      | {
          nazov: string;
          mesto: string;
          kraj: string;
          icp_score: number;
          team_size_estimate: number | null;
          portals_detected: string[] | null;
        }
      | null
      | Array<{
          nazov: string;
          mesto: string;
          kraj: string;
          icp_score: number;
          team_size_estimate: number | null;
          portals_detected: string[] | null;
        }>;

    const prospect = Array.isArray(prospectRaw) ? prospectRaw[0] ?? null : prospectRaw;

    const { subject, text } = buildPreDemoBriefText({
      inviteeName: b.invitee_name ?? "",
      inviteeEmail: b.invitee_email,
      scheduledAt: b.scheduled_at,
      utm: parseUtmFromBooking(b),
      prospect,
      unknownProspect: Boolean(b.unknown_prospect),
    });

    const mail = await sendDemoOpsEmail(subject, text);
    if (!mail.ok) {
      errors.push(`${b.id}: ${mail.error}`);
      continue;
    }

    const { error: updErr } = await admin
      .from("demo_bookings")
      .update({ brief_sent_at: new Date().toISOString() })
      .eq("id", b.id)
      .is("brief_sent_at", null);

    if (updErr) {
      errors.push(`${b.id}: ${updErr.message}`);
      continue;
    }
    sent += 1;
  }

  return NextResponse.json({
    ok: errors.length === 0,
    candidates: bookings?.length ?? 0,
    briefsSent: sent,
    errors,
  });
}
