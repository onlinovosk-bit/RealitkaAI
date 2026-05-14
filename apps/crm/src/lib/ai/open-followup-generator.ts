/**
 * W2 — generovanie follow-upu pre otvorené stagnujúce leady (batch Haiku, SK).
 */
import { callClaude, CLAUDE_HAIKU, extractJson } from "@/lib/ai/claude";
import type { Channel } from "@/lib/multi-channel-sender";

export const OPEN_FOLLOWUP_BATCH = 8;

export type StaleLeadInput = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  status: string;
  budget?: string | null;
  location?: string | null;
  last_contact?: string | null;
  note?: string | null;
  score?: number | null;
};

export type OpenFollowUpPlan = {
  lead_id: string;
  should_contact: boolean;
  channel: Channel;
  message: string;
  subject?: string;
  tone_note: string;
  broker_cc_needed: boolean;
  reason_sk: string;
};

const SYSTEM = `Si slovenský realitný obchodný asistent.
Pre každého leada rozhodni: má zmysel dnes (alebo zajtra ráno) poslať jemný follow-up?
Vygeneruj krátku, ľudskú správu PO SLOVENSKY — žiadny spam, max 3 krátke vety.
Ak kontakt nedáva zmysel, should_contact=false.
Kanál iba jeden z: sms, email, whatsapp — preferuj SMS ak je telefónny kontakt pravdepodobnejší ako email na rýchlu odpoveď.
broker_cc_needed: true ak treba zaradiť makléra do komunikácie (citlivá ponuka/právne).
reason_sk: jedna veta PO SLOVENSKY pre audit.
Výstup: validný JSON array, bez markdown.`;

type BatchRaw = {
  idx: number;
  should_contact: boolean;
  channel: string;
  message: string;
  subject?: string;
  tone_note: string;
  broker_cc_needed: boolean;
  reason_sk: string;
};

function safeChannel(raw: string): Channel {
  const c = String(raw ?? "").toLowerCase();
  if (c === "sms" || c === "whatsapp" || c === "linkedin") return c as Channel;
  return "email";
}

export async function generateOpenFollowUpsBatch(leads: StaleLeadInput[]): Promise<OpenFollowUpPlan[]> {
  if (!leads.length) return [];

  const compact = leads.map((l, i) => ({
    idx: i + 1,
    id: l.id,
    name: l.name,
    status: l.status,
    days_hint: String(l.last_contact ?? "").slice(0, 120),
    note: (l.note ?? "").slice(0, 800),
    has_phone: Boolean(l.phone?.trim()),
    has_email: Boolean(l.email?.trim()),
    location: (l.location ?? "").slice(0, 120),
    score: l.score ?? 50,
  }));

  const response = await callClaude({
    model: CLAUDE_HAIKU,
    max_tokens: OPEN_FOLLOWUP_BATCH * 180,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: `Spracuj ${leads.length} leadov:\n${JSON.stringify(compact, null, 2)}\n\nVráť JSON pole objektov s polami:
idx, should_contact, channel (sms|email|whatsapp), message, subject (iba email), tone_note, broker_cc_needed, reason_sk.
Zachovaj poradie idx 1..${leads.length}.`,
      },
    ],
  });

  const raw =
    response.content?.[0]?.type === "text" ? (response.content[0] as { text: string }).text : "[]";
  let rows: BatchRaw[];
  try {
    rows = extractJson<BatchRaw[]>(raw);
  } catch {
    return [];
  }

  const map = new Map(rows.map((r) => [r.idx, r]));
  return leads.map((lead, i) => {
    const r = map.get(i + 1);
    if (!r) {
      return {
        lead_id: lead.id,
        should_contact: false,
        channel: "email" as Channel,
        message: "",
        tone_note: "",
        broker_cc_needed: true,
        reason_sk: "Chýba AI výstup pre tento záznam.",
      };
    }
    return {
      lead_id: lead.id,
      should_contact: Boolean(r.should_contact),
      channel: safeChannel(r.channel),
      message: String(r.message ?? "").slice(0, 2000),
      subject: r.subject ? String(r.subject).slice(0, 120) : undefined,
      tone_note: String(r.tone_note ?? "").slice(0, 200),
      broker_cc_needed: Boolean(r.broker_cc_needed),
      reason_sk: String(r.reason_sk ?? "").slice(0, 400),
    };
  });
}
