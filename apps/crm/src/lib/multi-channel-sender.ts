// Multi-channel sender: SMS, WhatsApp, LinkedIn, Email (rozšíriteľné)
// Základné rozhranie a stub implementácie pre ďalšie kanály

export type Channel = 'email' | 'sms' | 'whatsapp' | 'linkedin';

export interface SendMessageInput {
  leadId: string;
  to: string;
  channel: Channel;
  subject?: string;
  body: string;
  aiGenerated?: boolean;
  meta?: Record<string, any>;
}

export interface SendMessageResult {
  ok: boolean;
  channel: Channel;
  to: string;
  messageId?: string;
  error?: string;
}


// === Multi-channel sendery (stub implementácie) ===
export async function sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
  switch (input.channel) {
    case 'email':
      return await sendEmail(input);
    case 'sms':
      return await sendSms(input);
    case 'whatsapp':
      return await sendWhatsapp(input);
    case 'linkedin':
      return await sendLinkedin(input);
    default:
      return { ok: false, channel: input.channel, to: input.to, error: 'Unknown channel' };
  }
}

import { Resend } from "resend";
// Email sender (Resend API)
async function sendEmail(input: SendMessageInput): Promise<SendMessageResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.OUTREACH_FROM_EMAIL;
  if (!apiKey) return { ok: false, channel: 'email', to: input.to, error: 'Chýba RESEND_API_KEY' };
  if (!from) return { ok: false, channel: 'email', to: input.to, error: 'Chýba OUTREACH_FROM_EMAIL' };
  const resend = new Resend(apiKey);
  try {
    const result = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject || 'AI správa',
      text: input.body,
    });
    if ((result as any).error) {
      return { ok: false, channel: 'email', to: input.to, error: (result as any).error.message || 'Resend error' };
    }
    return { ok: true, channel: 'email', to: input.to, messageId: (result as any).id };
  } catch (e) {
    return { ok: false, channel: 'email', to: input.to, error: e instanceof Error ? e.message : 'Resend error' };
  }
}


// SMS sender (Twilio API)
import twilio from "twilio";
async function sendSms(input: SendMessageInput): Promise<SendMessageResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_SMS_FROM;
  if (!accountSid || !authToken || !from) {
    return { ok: false, channel: 'sms', to: input.to, error: 'Chýba TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN alebo TWILIO_SMS_FROM' };
  }
  const client = twilio(accountSid, authToken);
  try {
    const result = await client.messages.create({
      body: input.body,
      from,
      to: input.to,
    });
    return { ok: true, channel: 'sms', to: input.to, messageId: result.sid };
  } catch (e) {
    return { ok: false, channel: 'sms', to: input.to, error: e instanceof Error ? e.message : 'Twilio error' };
  }
}


// WhatsApp sender (Twilio API)
async function sendWhatsapp(input: SendMessageInput): Promise<SendMessageResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!accountSid || !authToken || !from) {
    return { ok: false, channel: 'whatsapp', to: input.to, error: 'Chýba TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN alebo TWILIO_WHATSAPP_FROM' };
  }
  const client = twilio(accountSid, authToken);
  try {
    const result = await client.messages.create({
      body: input.body,
      from: `whatsapp:${from}`,
      to: `whatsapp:${input.to}`,
    });
    return { ok: true, channel: 'whatsapp', to: input.to, messageId: result.sid };
  } catch (e) {
    return { ok: false, channel: 'whatsapp', to: input.to, error: e instanceof Error ? e.message : 'Twilio error' };
  }
}

// Stub: LinkedIn sender (napr. LinkedIn API)
async function sendLinkedin(input: SendMessageInput): Promise<SendMessageResult> {
  // TODO: Integrácia s LinkedIn API
  return { ok: false, channel: 'linkedin', to: input.to, error: 'LinkedIn sender not implemented' };
}

// Testovacia utilita: odošli správu na všetky kanály (stub)
export async function sendTestMessage(leadId: string, to: string, body: string) {
  const results = await Promise.all([
    sendMessage({ leadId, to, channel: 'email', body }),
    sendMessage({ leadId, to, channel: 'sms', body }),
    sendMessage({ leadId, to, channel: 'whatsapp', body }),
    sendMessage({ leadId, to, channel: 'linkedin', body }),
  ]);
  return results;
}


// === KF5 — AI odpoveď cez Claude (nahradenie broken OpenAI) ===
import { getClaudeClient, CLAUDE_HAIKU } from "@/lib/ai/claude";

const CHANNEL_STYLE: Record<Channel, { instruction: string; maxTokens: number }> = {
  email:    { instruction: "Formálna, profesionálna, 3-5 viet, bez emoji. Zakončiť menom a kontaktom.", maxTokens: 200 },
  sms:      { instruction: "Maximálne 1-2 vety, bez diakritiky, bez emoji, max 160 znakov.", maxTokens: 60 },
  whatsapp: { instruction: "Priateľská, stručná, 1-3 vety, môže byť menej formálna, bez emoji.", maxTokens: 100 },
  linkedin: { instruction: "Profesionálna, sieťovacia, 2-3 vety, bez spamu, bez emoji.", maxTokens: 120 },
};

export async function generateAiReply(context: {
  leadId: string;
  channel: Channel;
  lastMessage: string;
  lead?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    budget?: string;
    propertyType?: string;
    rooms?: string;
    financing?: string;
    timeline?: string;
    status?: string;
    score?: number;
    note?: string;
  };
}): Promise<string> {
  const { channel, lastMessage, lead = {} } = context;
  const style = CHANNEL_STYLE[channel] ?? CHANNEL_STYLE.email;

  const leadContext = [
    lead.name      && `Meno: ${lead.name}`,
    lead.location  && `Lokalita: ${lead.location}`,
    lead.budget    && `Rozpočet: ${lead.budget}`,
    lead.propertyType && `Typ: ${lead.propertyType}`,
    lead.rooms     && `Izby: ${lead.rooms}`,
    lead.financing && `Financovanie: ${lead.financing}`,
    lead.timeline  && `Horizont: ${lead.timeline}`,
    lead.status    && `Status: ${lead.status}`,
    lead.note      && `Poznámka: ${lead.note}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const claude = getClaudeClient();
    const SYSTEM_REPLY = `Si asistent realitného makléra pre slovenský trh. Píšeš odpovede klientom v slovenčine. \
NIKDY nevymýšľaj informácie o nehnuteľnosti. Ak niečo nevieš, opýtaj sa klienta.`;
    const response = await claude.messages.create({
      model: CLAUDE_HAIKU,
      max_tokens: style.maxTokens,
      system: [{ type: "text", text: `${SYSTEM_REPLY} Štýl pre kanál ${channel}: ${style.instruction}`, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: `Kontekst leadu:\n${leadContext || "Žiadne dáta"}\n\nPosledná správa od klienta:\n"${lastMessage}"\n\nNapíš odpoveď makléra:`,
        },
      ],
    });
    return response.content[0].type === "text"
      ? response.content[0].text.trim()
      : "(prázdna odpoveď)";
  } catch (err) {
    console.error("generateAiReply chyba:", err);
    return `Ospravedlňujeme sa, momentálne nemôžeme odpovedať automaticky. Maklér vás čoskoro kontaktuje.`;
  }
}