/**
 * KF8 — Dead Lead Resurrection Campaign
 * Batch mode: 5 leadov per Claude call = 10x menej API calls vs. jednotlivé volania.
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
  lead:               DeadLeadInput;
  should_reactivate:  boolean;
  reactivation_score: number;   // 0–100 šanca na úspech
  reason:             string;   // Prečo reaktivovať alebo nie
  channel:            "sms" | "email" | "whatsapp";
  message:            string;   // Konkrétna správa na odoslanie
  subject?:           string;   // Pre email
  cooldown_days:      number;   // Minimálna pauza pred ďalším kontaktom
}

const SYSTEM = `Si expert na real estate sales recovery pre slovenský trh. \
Hodnotíš mŕtve leady a rozhoduješ ktoré majú zmysel reaktivovať a ako. \
Správy sú ľudské, konkrétne, nie spamové. Odkazuj na niečo konkrétne — novú nehnuteľnosť, zmenu trhu. \
Výstup je VŽDY validný JSON bez markdown.`;

export const BATCH_SIZE = 5;

function chunkArray<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}

function daysSince(dateStr?: string): number {
  if (!dateStr) return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function fallbackCandidate(lead: DeadLeadInput): ReactivationCandidate {
  const days = daysSince(lead.last_contact_at);
  return {
    lead,
    should_reactivate: days >= 30 && (lead.score ?? 50) >= 30,
    reactivation_score: 30,
    reason: "Automatické hodnotenie — skontroluj manuálne.",
    channel: "sms",
    message: `Ahoj ${lead.name}, ozyvam sa po case. Pribudli nam nove moznosti v ${lead.location ?? "okolí"}. Mate este zajem?`,
    cooldown_days: 30,
  };
}

interface BatchDecision {
  idx:                number;
  should_reactivate:  boolean;
  reactivation_score: number;
  reason:             string;
  channel:            "sms" | "email" | "whatsapp";
  message:            string;
  subject?:           string;
  cooldown_days:      number;
}

async function processBatch(
  leads: DeadLeadInput[],
  marketContext?: string
): Promise<ReactivationCandidate[]> {
  const client = getClaudeClient();

  const compactLeads = leads.map((lead, i) => ({
    idx:                i + 1,
    name:               lead.name,
    status:             lead.status,
    budget:             lead.budget ?? "neznámy",
    property_type:      lead.property_type ?? "neznámy",
    location:           lead.location ?? "neznáma",
    days_since_contact: daysSince(lead.last_contact_at),
    score:              lead.score ?? 50,
    note:               lead.note ?? "",
  }));

  const response = await client.messages.create({
    model:      CLAUDE_HAIKU,
    max_tokens: BATCH_SIZE * 160,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role:    "user",
        content: `Posuď ${leads.length} mŕtvych leadov naraz.${marketContext ? `\nTrhový kontext: ${marketContext}` : ""}

${JSON.stringify(compactLeads, null, 2)}

Vráť JSON array (jeden objekt per lead, zachovaj idx):
[
  {
    "idx": 1,
    "should_reactivate": true,
    "reactivation_score": 0-100,
    "reason": "Prečo reaktivovať alebo nie (1 veta)",
    "channel": "sms|email|whatsapp",
    "message": "Personalizovaná správa — ľudská, nie spamová (max 2-3 vety)",
    "subject": "Email predmet ak channel=email (max 50 znakov)",
    "cooldown_days": 14-90
  }
]`,
      },
    ],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "[]";
  try {
    const decisions = extractJson<BatchDecision[]>(raw);
    const map = new Map(decisions.map((d) => [d.idx, d]));
    return leads.map((lead, i) => {
      const d = map.get(i + 1);
      if (!d) return fallbackCandidate(lead);
      return { lead, should_reactivate: d.should_reactivate, reactivation_score: d.reactivation_score, reason: d.reason, channel: d.channel, message: d.message, subject: d.subject, cooldown_days: d.cooldown_days };
    });
  } catch {
    return leads.map(fallbackCandidate);
  }
}

/**
 * Batch: 5 leadov per Claude call. Pre 50 leadov = 10 API calls namiesto 50.
 */
export async function generateBatchReactivationPlan(
  leads: DeadLeadInput[],
  marketContext?: string
): Promise<ReactivationCandidate[]> {
  if (!leads.length) return [];
  const batches = chunkArray(leads, BATCH_SIZE);
  const results = await Promise.all(batches.map((b) => processBatch(b, marketContext)));
  return results.flat();
}

/**
 * Single lead — zachované pre backward compat a rescue trigger.
 */
export async function generateReactivationPlan(
  lead: DeadLeadInput,
  marketContext?: string
): Promise<ReactivationCandidate> {
  const [result] = await generateBatchReactivationPlan([lead], marketContext);
  return result;
}
