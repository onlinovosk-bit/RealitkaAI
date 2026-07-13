// REPO PATH: apps/crm/src/app/api/acquire/email/route.ts
// Nahrádza CELÝ starý súbor. Business logika (parseEmail/toLeadCandidate/dedup/insert)
// je 1:1 prevzatá zo starého, overeného kódu — mení sa LEN vstupná/auth vrstva:
// Resend webhook verify + receiving.get()  ->  shared secret + priamy Worker payload
// agencyForInbound(toAddr)                  ->  payload.mailbox.agencyId (Worker to už vyriešil)

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { dedupKey, parseEmail, toLeadCandidate } from "@/lib/acquire/email-adapter";
import { runInboundLeadTriageAndNotify } from "@/lib/acquire/inbound-lead-triage";
import { runInboundLeadAutoResponse } from "@/lib/acquire/inbound-lead-auto-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPORTED_VERSION = 1;
type InboundEmailPayload = {
  version?: number;
  receivedAt?: string;
  mailbox?: {
    agencyId?: string;
  };
  email?: {
    to?: string;
    subject?: string;
    text?: string;
    html?: string;
  };
};

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // rôzna dĺžka -> nikdy nesmie skratovo vrátiť skôr; porovnaj proti sebe rovnakej dĺžky
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA); // udrž konštantný čas aj pri nesúlade dĺžky
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export async function POST(req: NextRequest) {
  try {
    // 1. auth — shared secret namiesto Resend webhook podpisu, konštantné porovnanie
    const secret = req.headers.get("x-shared-secret");
    const expected = process.env.ACQUIRE_SHARED_SECRET?.trim();
    if (!expected) {
      return NextResponse.json({ ok: false, error: "gateway_not_configured" }, { status: 503 });
    }
    if (!secret || !safeCompare(secret, expected)) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const requestId = req.headers.get("x-revolis-request-id") ?? "unknown";

    // 2. payload z Workera (JSON, nie raw text — nepotrebujeme svix podpis)
    let payload: InboundEmailPayload;
    try {
      payload = (await req.json()) as InboundEmailPayload;
    } catch {
      return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }
    if (payload?.version !== SUPPORTED_VERSION) {
      return NextResponse.json({ ok: false, error: "unsupported_version" }, { status: 400 });
    }

    const agencyId: string | undefined = payload?.mailbox?.agencyId;
    const email = payload?.email;
    if (!agencyId || !email?.text && !email?.subject && !email?.html) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    // 3. presne rovnaký vstup pre parser ako predtým: combined raw string + dátum
    const raw = [email.subject ?? "", email.text ?? "", email.html ?? ""].join("\n");
    const receivedAt = (payload.receivedAt ?? new Date().toISOString()).slice(0, 10);
    const ev = parseEmail(raw, receivedAt);
    const key = dedupKey(ev);

    const supa = createServiceRoleClient();
    if (!supa) {
      return NextResponse.json({ ok: false, error: "db_unavailable" }, { status: 503 });
    }

    // 4. dedup check — SELECT najprv (presne ako pôvodne), duplicate flag ide do toLeadCandidate
    const { data: existing } = await supa
      .from("acquire_dedup_keys")
      .select("key")
      .eq("key", key)
      .maybeSingle();
    const duplicate = !!existing;

    const candidate = toLeadCandidate(ev, agencyId, duplicate);
    if (!candidate) {
      console.log(JSON.stringify({
        status: "NOT_A_LEAD", requestId, agencyId, event_id: ev.eventId,
        reason: duplicate ? "duplicate" : "not_a_lead",
      }));
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
      .select("id,name,status,score,last_contact,note,source,agency_id,ai_triage_at")
      .single();

    if (error) {
      console.error("[acquire.email] insert error=", JSON.stringify(error));
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // operational readiness — last_received_at (nové oproti starému, neškodné pridanie)
    if (email.to) {
      await supa.from("inbound_mailboxes")
        .update({ last_received_at: new Date().toISOString() })
        .eq("agency_id", agencyId)
        .eq("email", email.to);
    }

    await runInboundLeadTriageAndNotify(supa, lead, candidate);
    await runInboundLeadAutoResponse(supa, lead, candidate);

    console.log(JSON.stringify({ status: "LEAD_CREATED", requestId, agencyId, lead_id: lead.id }));
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
