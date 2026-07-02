export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { parseUtmFromBooking } from "@/lib/demo-ops/brief-builder";
import { generateRecapDraft } from "@/lib/demo-ops/recap-generator";
import { sendDemoOpsEmail } from "@/lib/demo-ops/send-ops-email";

function startOfTodayBratislava(): Date {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bratislava",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, d] = fmt.format(new Date()).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dayStart = startOfTodayBratislava();
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const now = new Date();

  const admin = createAdminClient();
  const { data: bookings, error } = await admin
    .from("demo_bookings")
    .select(
      `id, invitee_name, invitee_email, scheduled_at, recap_draft, recap_approval_sent_at,
       utm_content, utm_source, utm_medium, utm_campaign,
       demo_prospects ( nazov )`,
    )
    .gte("scheduled_at", dayStart.toISOString())
    .lt("scheduled_at", dayEnd.toISOString())
    .lte("scheduled_at", now.toISOString())
    .is("recap_approval_sent_at", null);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let processed = 0;
  const errors: string[] = [];

  for (const b of bookings ?? []) {
    try {
      const prospectRaw = b.demo_prospects as { nazov: string } | null | Array<{ nazov: string }>;
      const company = Array.isArray(prospectRaw)
        ? prospectRaw[0]?.nazov ?? null
        : prospectRaw?.nazov ?? null;

      const draft =
        b.recap_draft ??
        (await generateRecapDraft({
          inviteeName: b.invitee_name || b.invitee_email,
          companyName: company,
          utm: parseUtmFromBooking(b),
        }));

      const subject = `Recap draft na schválenie: ${company ?? b.invitee_name ?? b.invitee_email}`;
      const text = [
        "Interný návrh follow-upu (NEPOSIELAŤ klientovi bez úpravy):",
        "",
        draft,
        "",
        `— Booking: ${b.invitee_email} · ${b.scheduled_at ?? ""}`,
      ].join("\n");

      const mail = await sendDemoOpsEmail(subject, text);
      if (!mail.ok) {
        errors.push(`${b.id}: ${mail.error}`);
        continue;
      }

      const { error: updErr } = await admin
        .from("demo_bookings")
        .update({
          recap_draft: draft,
          recap_approval_sent_at: new Date().toISOString(),
        })
        .eq("id", b.id)
        .is("recap_approval_sent_at", null);

      if (updErr) {
        errors.push(`${b.id}: ${updErr.message}`);
        continue;
      }
      processed += 1;
    } catch (e) {
      errors.push(`${b.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    candidates: bookings?.length ?? 0,
    recapsSent: processed,
    errors,
  });
}
