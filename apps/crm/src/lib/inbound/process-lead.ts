// ================================================================
// Revolis.AI — Inbound Lead Processor
// insert → BRI → logEvent → auto-reply (email + WhatsApp)
// ================================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { computeBRI } from "@/lib/bri/engine";
import { logEvent } from "@/lib/events/log-event";
import { generateAutoReply } from "./auto-reply";
import { Resend } from "resend";

const FROM = process.env.OUTREACH_FROM_EMAIL ?? "noreply@revolis.ai";
const BRI_REPLY_THRESHOLD = 40; // minimum score to trigger auto-reply

export interface InboundLeadPayload {
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  message?: string;
  propertyType?: string;
  location?: string;
  budget?: string;
  profileId: string;
}

export interface ProcessLeadResult {
  leadId: string;
  briScore: number;
  replySent: boolean;
  replyChannels: string[];
}

export async function processInboundLead(
  payload: InboundLeadPayload,
  scoped?: SupabaseClient | null,
): Promise<ProcessLeadResult> {
  const supabase = scoped ?? (await createClient());

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, full_name, agency_id")
    .eq("id", payload.profileId)
    .maybeSingle();

  if (profileErr) {
    throw new Error(profileErr.message);
  }
  if (!profile) {
    throw new Error("profile_not_found");
  }
  const agencyId = typeof profile.agency_id === "string" ? profile.agency_id.trim() : "";
  if (!agencyId) {
    throw new Error("profile_missing_agency");
  }

  // 1. Insert lead (must succeed — never ACK a dropped inbound)
  const leadId = crypto.randomUUID();
  const { error: insertError } = await supabase.from("leads").insert({
    id: leadId,
    agency_id: agencyId,
    name: payload.name,
    email: payload.email ?? "",
    phone: payload.phone ?? "",
    source: payload.source ?? "Inbound",
    note: payload.message ?? "",
    location: payload.location ?? "",
    budget: payload.budget ?? "",
    property_type: payload.propertyType ?? "Byt",
    status: "Nový",
    score: 50,
    assigned_agent: "Nepriradený",
    last_contact: "Práve importovaný",
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  // 2. Compute BRI — null means compute failed; do not invent a score that triggers reply
  const bri = await computeBRI(leadId, payload.profileId, "lead_created");
  const briScore = bri?.new_score ?? 0;

  // 3. Audit event
  await logEvent({
    profileId: payload.profileId,
    entityType: "lead",
    entityId: leadId,
    eventType: "lead_created",
    payload: {
      source: payload.source,
      bri_score: briScore,
      has_email: !!payload.email,
      has_phone: !!payload.phone,
      agency_id: agencyId,
    },
  });

  const replyChannels: string[] = [];

  if (!bri || briScore < BRI_REPLY_THRESHOLD || !payload.email) {
    return { leadId, briScore, replySent: false, replyChannels };
  }

  const reply = await generateAutoReply({
    leadName: payload.name,
    source: payload.source ?? "web",
    message: payload.message,
    propertyType: payload.propertyType,
    location: payload.location,
    budget: payload.budget,
    agentName: profile.full_name ?? undefined,
  });

  // 4. Email via Resend
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) throw new Error("RESEND_API_KEY is not configured");
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: FROM,
      to: payload.email,
      subject: reply.subject,
      text: reply.body,
    });
    replyChannels.push("email");
    logEvent({
      profileId: payload.profileId,
      entityType: "lead",
      entityId: leadId,
      eventType: "message_sent",
      payload: { channel: "email", subject: reply.subject, auto_reply: true },
    }).catch((e) => console.error("[processInboundLead] logEvent email:", e));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[processInboundLead] email failed:", message);
  }

  // 5. WhatsApp (no-op if env vars not set)
  if (payload.phone && process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) {
    try {
      await sendWhatsApp(payload.phone, reply.body);
      replyChannels.push("whatsapp");
      logEvent({
        profileId: payload.profileId,
        entityType: "lead",
        entityId: leadId,
        eventType: "message_sent",
        payload: { channel: "whatsapp", auto_reply: true },
      }).catch((e) => console.error("[processInboundLead] logEvent whatsapp:", e));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[processInboundLead] WhatsApp failed:", message);
    }
  }

  return { leadId, briScore, replySent: replyChannels.length > 0, replyChannels };
}

async function sendWhatsApp(phone: string, message: string): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) throw new Error("WHATSAPP_TOKEN is not configured");
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!phoneId) throw new Error("WHATSAPP_PHONE_ID is not configured");
  // Ensure E.164 — default to SK prefix if no country code
  const to = phone.startsWith("+")
    ? phone.replace(/\s/g, "")
    : `+421${phone.replace(/\D/g, "")}`;

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${phoneId}/messages`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`WhatsApp API ${res.status}: ${detail}`);
  }
}
