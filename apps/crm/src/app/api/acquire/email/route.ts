import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { dedupKey, parseEmail, toLeadCandidate } from "@/lib/acquire/email-adapter";
import { agencyForInbound } from "@/lib/acquire/agency-map";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

export async function POST(req: NextRequest) {
  try {
    const resend = getResend();
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim();
    if (!resend || !webhookSecret) {
      return NextResponse.json({ ok: false, error: "gateway_not_configured" }, { status: 503 });
    }

    // 1. RAW telo (kvôli podpisu — NIE json parse pred verify!)
    const payload = await req.text();
    const id = req.headers.get("svix-id");
    const timestamp = req.headers.get("svix-timestamp");
    const signature = req.headers.get("svix-signature");
    if (!id || !timestamp || !signature) {
      return NextResponse.json({ ok: false, error: "Missing headers" }, { status: 400 });
    }

    // 2. Overenie podpisu cez Resend SDK (vracia parsed payload alebo throw)
    const result = resend.webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret,
    }) as { type?: string; data?: { email_id?: string } };

    // 3. Guard: len email.received
    if (result.type !== "email.received") {
      return NextResponse.json({ ok: true, ignored: result.type }, { status: 200 });
    }

    const emailId = result.data?.email_id;
    if (!emailId) {
      return NextResponse.json({ ok: false, error: "missing_email_id" }, { status: 400 });
    }

    // 4. Dotiahni telo mailu (webhook ho NEobsahuje — len email_id)
    const { data: email, error: emailErr } = await resend.emails.receiving.get(emailId);
    if (emailErr || !email) {
      return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 502 });
    }

    // 5. Agency podľa adresy príjemcu (server-side)
    const toAddr = (Array.isArray(email.to) ? email.to[0] : email.to) ?? "";
    const agencyId = agencyForInbound(toAddr);
    if (!agencyId) {
      return NextResponse.json({ ok: false, error: "unknown_inbound" }, { status: 422 });
    }

    // 6. Parser na reálnom obsahu
    const raw = [email.subject ?? "", email.text ?? "", email.html ?? ""].join("\n");
    const receivedAt = (email.created_at ?? new Date().toISOString()).slice(0, 10);
    const ev = parseEmail(raw, receivedAt);
    const key = dedupKey(ev);

    const supa = createServiceRoleClient();
    if (!supa) {
      return NextResponse.json({ ok: false, error: "db_unavailable" }, { status: 503 });
    }

    const { data: existing } = await supa
      .from("acquire_dedup_keys")
      .select("key")
      .eq("key", key)
      .maybeSingle();
    const duplicate = !!existing;

    const candidate = toLeadCandidate(ev, agencyId, duplicate);
    if (!candidate) {
      return NextResponse.json({
        ok: true,
        lead_created: false,
        reason: duplicate ? "duplicate" : "not_a_lead",
        event_id: ev.eventId,
      });
    }

    await supa.from("acquire_dedup_keys").insert({
      key,
      event_id: ev.eventId,
      agency_id: agencyId,
    });

    const { data: lead, error } = await supa
      .from("leads")
      .insert({
        id: crypto.randomUUID(),
        agency_id: candidate.agencyId,
        name: candidate.name.slice(0, 200),
        email: candidate.email.slice(0, 254),
        phone: candidate.phone.slice(0, 50),
        location: "",
        budget: "",
        property_type: "Byt",
        rooms: "",
        financing: "Hypotéka",
        timeline: "",
        source: candidate.source,
        status: candidate.status,
        score: 50,
        assigned_agent: "Nepriradený",
        assigned_profile_id: null,
        last_contact: "Práve vytvorený (email gateway)",
        note: candidate.note.slice(0, 5000),
      })
      .select("id")
      .single();

    if (error) {
      console.error("[acquire.email] insert error=", JSON.stringify(error));
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      lead_created: true,
      lead_id: lead.id,
      event_id: ev.eventId,
    });
  } catch (e) {
    console.error("[acquire.email]", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
