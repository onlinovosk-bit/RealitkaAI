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


// === AI odpoveď cez LLM (OpenAI) alebo fallback ===
import OpenAI from "openai";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

// Rozšírené AI odpovede pre všetky kanály s lepším promptom a kontextom
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
  const client = getOpenAIClient();
  // Dynamický prompt podľa kanála
  let style = '';
  let maxTokens = 120;
  switch (context.channel) {
    case 'email':
      style = 'Formálna, profesionálna, dlhšia odpoveď (3-5 viet), bez emoji.';
      maxTokens = 180;
      break;
    case 'sms':
      style = 'Veľmi stručná, jasná, max 1-2 vety, bez diakritiky, bez emoji.';
      maxTokens = 60;
      break;
    case 'whatsapp':
      style = 'Priateľská, stručná, 1-3 vety, môže byť menej formálna, bez emoji.';
      maxTokens = 80;
      break;
    case 'linkedin':
      style = 'Profesionálna, sieťovacia, 2-3 vety, žiadny spam, žiadne emoji.';
      maxTokens = 100;
      break;
    default:
      style = 'Stručná odpoveď.';
  }
  // Kontext leadu
  const lead = context.lead || {};
  const leadInfo = `Meno: ${lead.name || ''}\nEmail: ${lead.email || ''}\nTelefón: ${lead.phone || ''}\nLokalita: ${lead.location || ''}\nRozpočet: ${lead.budget || ''}\nTyp: ${lead.propertyType || ''}\nIzby: ${lead.rooms || ''}\nFinancovanie: ${lead.financing || ''}\nČasový horizont: ${lead.timeline || ''}\nStav: ${lead.status || ''}\nScore: ${lead.score || ''}\nPoznámka: ${lead.note || ''}`;
  const prompt = `Napíš AI odpoveď v slovenčine na správu klienta cez kanál ${context.channel}.\nŠtýl: ${style}\n\nLead:\n${leadInfo}\n\nPosledná správa od klienta:\n${context.lastMessage}\n\nOdpoveď:`;
  if (!client) {
    return `AI odpoveď na kanáli ${context.channel}: (stub)`;
  }
  try {
    const response = await client.completions.create({
      model: "gpt-4.1-mini",
      prompt,
      max_tokens: maxTokens,
      temperature: 0.7,
    });
    const text = response.choices?.[0]?.text?.trim();
    return text || `AI odpoveď na kanáli ${context.channel}: (empty)`;
  } catch {
    return `AI odpoveď na kanáli ${context.channel}: (error)`;
  }
}