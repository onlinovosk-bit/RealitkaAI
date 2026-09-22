// REPO PATH: apps/crm/src/app/api/acquire/email/route.ts
// Nahrádza CELÝ starý súbor. Parser a candidate mapping zostávajú prevzaté
// zo starého overeného kódu; dedup/insert vrstva má následné idempotency hotfixy.
// Pôvodná vstupná/auth zmena:
// Resend webhook verify + receiving.get()  ->  shared secret + priamy Worker payload
// agencyForInbound(toAddr)                  ->  payload.mailbox.agencyId (Worker to už vyriešil)

import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
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

function isUniqueConflict(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "23505" || /duplicate|unique/i.test(error.message ?? "");
}

type SupabaseAdmin = ReturnType<typeof createServiceRoleClient>;
type MailboxOwner = { profileId: string; agentName: string };

/** Prijímacia adresa je normalizovaná na lowercase; riadky v DB sú tak uložené. */
function normalizeMailbox(addr: string | null | undefined): string | null {
  const v = addr?.trim().toLowerCase();
  return v ? v : null;
}

/**
 * Ktorému maklérovi patrí adresa, na ktorú mail prišiel.
 * `inbound_mailboxes.profile_id` je NULL pri adresách celej agentúry (napr. office@) —
 * vtedy vraciame null a lead ostáva nepriradený, presne ako doteraz.
 * Profil sa overuje aj proti `agency_id`: lead sa nikdy nepriradí maklérovi z inej agentúry.
 */
async function resolveMailboxOwner(
  supa: NonNullable<SupabaseAdmin>,
  agencyId: string,
  mailbox: string | null,
): Promise<MailboxOwner | null> {
  if (!mailbox) return null;

  const { data: row, error } = await supa
    .from("inbound_mailboxes")
    .select("profile_id")
    .eq("agency_id", agencyId)
    .eq("email", mailbox)
    .maybeSingle();
  if (error) {
    console.error("[acquire.email] mailbox lookup error=", JSON.stringify(error));
    return null;
  }
  const profileId = row?.profile_id;
  if (!profileId) return null;

  const { data: profile, error: profileError } = await supa
    .from("profiles")
    .select("full_name")
    .eq("id", profileId)
    .eq("agency_id", agencyId)
    .maybeSingle();
  if (profileError) {
    console.error("[acquire.email] owner profile lookup error=", JSON.stringify(profileError));
    return null;
  }
  if (!profile) return null;

  return { profileId, agentName: profile.full_name ?? "Priradený agent" };
}

/**
 * Heartbeat doručenia. Beží pri KAŽDOM prijatom maili, nielen keď vznikne lead —
 * inak by sa kanál bez dopytov nedal odlíšiť od pokazeného preposielania.
 */
async function markMailboxReceived(
  supa: NonNullable<SupabaseAdmin>,
  agencyId: string,
  mailbox: string | null,
): Promise<void> {
  if (!mailbox) return;
  const { error } = await supa
    .from("inbound_mailboxes")
    .update({ last_received_at: new Date().toISOString() })
    .eq("agency_id", agencyId)
    .eq("email", mailbox);
  if (error) {
    console.error("[acquire.email] last_received_at update error=", JSON.stringify(error));
  }
}

/**
 * Tá istá portálová notifikácia chodí na office@ aj na adresu makléra a dedup ju zlúči
 * do jedného leadu. Ak prvá dorazí kópia z office@, lead vznikne nepriradený a kópia
 * od makléra by sa zahodila aj s informáciou, čí ten dopyt je. Preto ju tu doplníme.
 *
 * `.is("assigned_profile_id", null)` robí operáciu idempotentnou a zároveň zaručuje,
 * že nikdy neprepíšeme priradenie, ktoré už niekto urobil ručne.
 */
async function backfillLeadOwner(
  supa: NonNullable<SupabaseAdmin>,
  leadId: string,
  agencyId: string,
  owner: MailboxOwner | null,
): Promise<boolean> {
  if (!owner) return false;
  const { data, error } = await supa
    .from("leads")
    .update({ assigned_profile_id: owner.profileId, assigned_agent: owner.agentName })
    .eq("id", leadId)
    .eq("agency_id", agencyId)
    .is("assigned_profile_id", null)
    .select("id");
  if (error) {
    console.error("[acquire.email] owner backfill error=", JSON.stringify(error));
    return false;
  }
  return Array.isArray(data) && data.length > 0;
}

function deterministicLeadId(key: string): string {
  const hex = createHash("sha256").update(`acquire-email-lead:${key}`).digest("hex");
  const version = `5${hex.slice(13, 16)}`;
  const variant = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${version}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
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
    // recipient: parser podľa nej vylúči adresu samotnej RK / ingest schránky
    // z výberu kontaktu (inak vznikol lead s e-mailom office@realitysmolko.sk)
    const ev = parseEmail(raw, receivedAt, { recipient: email.to ?? null });
    const key = dedupKey(ev);

    const supa = createServiceRoleClient();
    if (!supa) {
      return NextResponse.json({ ok: false, error: "db_unavailable" }, { status: 503 });
    }

    // 3b. komu adresa patrí + heartbeat doručenia. Oboje pred dedupom, aby sa
    // zaznamenal aj mail, z ktorého lead nevznikne (duplicita, not_a_lead).
    const mailbox = normalizeMailbox(email.to);
    const owner = await resolveMailboxOwner(supa, agencyId, mailbox);
    await markMailboxReceived(supa, agencyId, mailbox);

    // 4. dedup check — SELECT najprv (presne ako pôvodne), duplicate flag ide do toLeadCandidate
    const { data: existing } = await supa
      .from("acquire_dedup_keys")
      .select("key")
      .eq("key", key)
      .maybeSingle();
    const duplicate = !!existing;

    const candidate = toLeadCandidate(ev, agencyId, duplicate);
    if (!candidate) {
      // Duplicita nesie majiteľa, ktorý pôvodnej kópii chýbal — doplň ho, než ju zahodíme.
      const ownerBackfilled = duplicate
        ? await backfillLeadOwner(supa, deterministicLeadId(key), agencyId, owner)
        : false;
      console.log(JSON.stringify({
        status: "NOT_A_LEAD", requestId, agencyId, event_id: ev.eventId,
        reason: duplicate ? "duplicate" : "not_a_lead",
        owner_backfilled: ownerBackfilled,
      }));
      return NextResponse.json({
        ok: true,
        lead_created: false,
        reason: duplicate ? "duplicate" : "not_a_lead",
        owner_backfilled: ownerBackfilled,
        event_id: ev.eventId,
      });
    }

    // Claim dedup BEFORE lead insert so concurrent workers cannot double-insert.
    // On lead failure we MUST delete the claim — otherwise retries see duplicate=true,
    // toLeadCandidate returns null, and the inbound lead is permanently lost
    // (amplified by 8s Supabase fetch abort: partial success leaves an orphan key).
    const { error: dedupError } = await supa.from("acquire_dedup_keys").insert({
      key,
      event_id: ev.eventId,
      agency_id: agencyId,
    });
    if (isUniqueConflict(dedupError)) {
      const ownerBackfilled = await backfillLeadOwner(
        supa, deterministicLeadId(key), agencyId, owner,
      );
      console.log(JSON.stringify({
        status: "NOT_A_LEAD", requestId, agencyId, event_id: ev.eventId,
        reason: "duplicate",
        owner_backfilled: ownerBackfilled,
      }));
      return NextResponse.json({
        ok: true,
        lead_created: false,
        reason: "duplicate",
        owner_backfilled: ownerBackfilled,
        event_id: ev.eventId,
      });
    }
    if (dedupError) {
      console.error("[acquire.email] dedup claim error=", JSON.stringify(dedupError));
      return NextResponse.json({ ok: false, error: dedupError.message }, { status: 500 });
    }

    const leadId = deterministicLeadId(key);
    const leadSelect = "id,name,status,score,last_contact,note,source,agency_id,ai_triage_at";

    const { data: lead, error } = await supa
      .from("leads")
      .insert({
        id: leadId,
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
        assigned_agent: owner?.agentName ?? "Nepriradený",
        assigned_profile_id: owner?.profileId ?? null,
        last_contact: "Práve vytvorený (email gateway)",
        note: candidate.note.slice(0, 5000),
      })
      .select(leadSelect)
      .single();

    if (error) {
      console.error("[acquire.email] insert error=", JSON.stringify(error));
      if (isUniqueConflict(error)) {
        const { data: existingLead, error: existingLeadError } = await supa
          .from("leads")
          .select(leadSelect)
          .eq("id", leadId)
          .maybeSingle();
        if (existingLead) {
          const ownerBackfilled = await backfillLeadOwner(
            supa, String(existingLead.id), agencyId, owner,
          );
          console.log(JSON.stringify({
            status: "LEAD_ALREADY_EXISTS",
            requestId,
            agencyId,
            lead_id: existingLead.id,
            event_id: ev.eventId,
            owner_backfilled: ownerBackfilled,
          }));
          return NextResponse.json({
            ok: true,
            lead_created: false,
            reason: "duplicate",
            lead_id: existingLead.id,
            owner_backfilled: ownerBackfilled,
            event_id: ev.eventId,
          });
        }
        if (existingLeadError) {
          console.error(
            "[acquire.email] failed to load existing deterministic lead=",
            JSON.stringify(existingLeadError),
          );
        }
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      const { error: releaseError } = await supa
        .from("acquire_dedup_keys")
        .delete()
        .eq("key", key);
      if (releaseError) {
        console.error(
          "[acquire.email] failed to release dedup claim after lead insert error=",
          JSON.stringify(releaseError),
        );
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // `last_received_at` sa zapisuje už v kroku 3b — pri každom prijatom maili, nielen tu.

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
