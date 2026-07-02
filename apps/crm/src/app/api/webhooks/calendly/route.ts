export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyCalendlySignature } from "@/lib/demo-ops/calendly-verify";
import { parseCalendlyInviteeCreated, extractEmailDomain } from "@/lib/demo-ops/calendly-payload";

async function matchProspectId(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<{ prospectId: string | null; unknown: boolean }> {
  const domain = extractEmailDomain(email);
  if (!domain) return { prospectId: null, unknown: true };

  const personalDomains = ["gmail.com", "azet.sk", "zoznam.sk", "yahoo.com", "outlook.com", "hotmail.com"];
  if (personalDomains.includes(domain)) return { prospectId: null, unknown: true };

  const { data } = await admin
    .from("demo_prospects")
    .select("id")
    .eq("email_domain", domain)
    .eq("disqualified", false)
    .order("icp_score", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { prospectId: data?.id ?? null, unknown: !data?.id };
}

export async function POST(req: NextRequest) {
  const secret = process.env.CALENDLY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CALENDLY_WEBHOOK_SECRET not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("calendly-webhook-signature");
  if (!verifyCalendlySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseCalendlyInviteeCreated(body);
  if (!parsed) {
    return NextResponse.json({ ok: true, skipped: true, reason: "not_invitee_created" });
  }

  const admin = createAdminClient();
  const { prospectId, unknown } = await matchProspectId(admin, parsed.email);
  const tracking = parsed.tracking ?? {};

  const row = {
    calendly_invitee_uri: parsed.inviteeUri,
    calendly_event_uri: parsed.eventUri,
    invitee_email: parsed.email,
    invitee_name: parsed.name,
    scheduled_at: parsed.scheduledAt,
    utm_source: tracking.utm_source ?? null,
    utm_medium: tracking.utm_medium ?? null,
    utm_campaign: tracking.utm_campaign ?? null,
    utm_content: tracking.utm_content ?? null,
    utm_term: tracking.utm_term ?? null,
    prospect_id: prospectId,
    unknown_prospect: unknown,
    raw_payload: body as Record<string, unknown>,
  };

  const { data, error } = await admin
    .from("demo_bookings")
    .upsert(row, { onConflict: "calendly_invitee_uri", ignoreDuplicates: false })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[calendly-webhook]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    bookingId: data?.id ?? null,
    prospectMatched: Boolean(prospectId),
    unknownProspect: unknown,
  });
}
