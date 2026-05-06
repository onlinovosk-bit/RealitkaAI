/**
 * KF8 — Dead Lead Resurrection Campaign
 * Načíta mŕtve leady → Claude generuje personalizované správy → ukáže preview → batch send.
 *
 * Workflow: GET /api/ai/dead-lead-campaign/preview → admin schváli → POST /api/ai/dead-lead-campaign/send
 */

import { getClaudeClient, CLAUDE_HAIKU, extractJson } from "./claude";

export interface DeadLeadInput {
  id:              string;
  name:            string;
  email?:          string;
  phone?:          string;
  status:          string;
  budget?:         string;
  property_type?:  string;
  location?:       string;
  last_contact_at?: string;
  score?:          number;
  note?:           string;
}

export interface ReactivationCandidate {
  lead:            DeadLeadInput;
  should_reactivate: boolean;
  reactivation_score: number;   // 0–100 šanca na úspech
  reason:          string;       // Prečo reaktivovať
  channel:         "sms" | "email" | "whatsapp";
  message:         string;       // Konkrétna správa na odoslanie
  subject?:        string;       // Pre email
  cooldown_days:   number;       // Minimálna pauza pred ďalším kontaktom
}

const SYSTEM = `Si expert na real estate sales recovery pre slovenský trh. \
Hodnotíš mŕtve leady a rozhoduješ ktoré majú zmysel reaktivovať a ako. \
Správy sú ľudské, konkrétne, nie spamové. Odkazuj na niečo konkrétne — novú nehnuteľnosť, zmenu trhu. \
Výstup je VŽDY validný JSON bez markdown.`;

export async function generateReactivationPlan(
  lead: DeadLeadInput,
  marketContext?: string
): Promise<ReactivationCandidate> {
  const daysSinceContact = lead.last_contact_at
    ? Math.floor((Date.now() - new Date(lead.last_contact_at).getTime()) / 86_400_000)
    : 999;

  const client = getClaudeClient();

  const response = await client.messages.create({
    model: CLAUDE_HAIKU,
    max_tokens: 400,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: `Mŕtvy lead na posúdenie:
Meno: ${lead.name}
Status: ${lead.status}
Rozpočet: ${lead.budget ?? "neznámy"}
Typ nehnuteľnosti: ${lead.property_type ?? "neznámy"}
Lokalita: ${lead.location ?? "neznáma"}
Dni od posledného kontaktu: ${daysSinceContact}
Score: ${lead.score ?? 50}
Poznámka: ${lead.note ?? "žiadna"}
${marketContext ? `Trhový kontext: ${marketContext}` : ""}

Vráť JSON:
{
  "should_reactivate": true/false,
  "reactivation_score": 0-100,
  "reason": "Prečo reaktivovať alebo nie (1 veta)",
  "channel": "sms|email|whatsapp",
  "message": "Personalizovaná správa — ľudská, konkrétna, nie spamová (max 2-3 vety)",
  "subject": "Email predmet ak channel=email (max 50 znakov)",
  "cooldown_days": 14-90
}`,
      },
    ],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  try {
    const parsed = extractJson<Omit<ReactivationCandidate, "lead">>(raw);
    return { ...parsed, lead };
  } catch {
    return {
      lead,
      should_reactivate: daysSinceContact >= 30 && (lead.score ?? 50) >= 30,
      reactivation_score: 30,
      reason: "Automatické hodnotenie — skontroluj manuálne.",
      channel: "sms",
      message: `Ahoj ${lead.name}, ozyvam sa po case. Pribudli nam nove moznosti v ${lead.location ?? "okolí"}. Mate este zajem?`,
      cooldown_days: 30,
    };
  }
}
