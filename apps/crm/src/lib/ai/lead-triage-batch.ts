/**
 * W1 — batch Haiku triage (10–20 leadov). Výstup uložený ako ai_priority + ai_reason (SK).
 */
import { callClaude, CLAUDE_HAIKU, extractJson } from "@/lib/ai/claude";
import {
  buildTriageAiCompactRow,
  triageFallbackPriority,
} from "@/ai/triage-fallback-scoring";
import { normalizeAiPriority, type AiPrioritySk } from "@/lib/workflows/lead-ai-priority";

export const TRIAGE_BATCH_SIZE = 18;

export type TriageLeadInput = {
  id: string;
  name: string;
  status: string;
  score: number;
  last_contact?: string | null;
  /** Pre fallback skóre rozpočtu (EUR text z CRM). */
  budget?: string | null;
  note?: string | null;
  source?: string | null;
};

export type LeadTriageOutput = {
  lead_id: string;
  priority: AiPrioritySk;
  reason: string;
};

const SYSTEM = `SK realitná kancelária. Vstup: pole {id, urgency 1-10, budget 1-10, last_activity_days, stage, interactions 1-10} — žiadne dlhé texty.
Úloha: pre každé id dnešná priorita práce: presne "Vysoká" | "Stredná" | "Nízka" a krátka veta reason (SK).
Výstup: čistý JSON pole objektov {"lead_id","priority","reason"} — lead_id = id zo vstupu. Bez markdown.`;

function fallbackChunkOutputs(leads: TriageLeadInput[], note: string): LeadTriageOutput[] {
  return leads.map((l) => {
    const fb = triageFallbackPriority({
      status: l.status,
      score: l.score,
      budget: l.budget,
      last_contact: l.last_contact,
    });
    const merged = `${fb.reason} ${note}`.trim();
    return {
      lead_id: l.id,
      priority: fb.priority,
      reason: merged.slice(0, 500),
    };
  });
}

async function triageChunk(leads: TriageLeadInput[]): Promise<LeadTriageOutput[]> {
  if (leads.length === 0) return [];

  const compact = leads.map(buildTriageAiCompactRow);
  const payload = JSON.stringify(compact);

  let raw: string;
  try {
    const response = await callClaude({
      model: CLAUDE_HAIKU,
      max_tokens: Math.min(900, 55 * leads.length + 100),
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: `Triage batch (${leads.length}).\n${payload}`,
        },
      ],
    });
    raw =
      response.content?.[0]?.type === "text" ? (response.content[0] as { text: string }).text : "[]";
  } catch (e) {
    const msg = e instanceof Error ? e.message.replace(/\s+/g, " ").trim().slice(0, 160) : "chyba";
    return fallbackChunkOutputs(leads, `AI volanie zlyhalo (${msg}).`);
  }

  let parsed: LeadTriageOutput[];
  try {
    parsed = extractJson<LeadTriageOutput[]>(raw);
  } catch {
    return fallbackChunkOutputs(leads, "Model nevrátil platný JSON.");
  }

  const byId = new Map(parsed.map((p) => [p.lead_id, p]));
  return leads.map((l) => {
    const row = byId.get(l.id);
    if (!row) {
      return fallbackChunkOutputs([l], "Chýbal záznam v batch výstupe.")[0];
    }
    return {
      lead_id: row.lead_id,
      priority: normalizeAiPriority(row.priority),
      reason: String(row.reason ?? "").slice(0, 500) || "Bez doplnenia.",
    };
  });
}

export async function triageLeadBatches(leads: TriageLeadInput[]): Promise<LeadTriageOutput[]> {
  const out: LeadTriageOutput[] = [];
  for (let i = 0; i < leads.length; i += TRIAGE_BATCH_SIZE) {
    const chunk = leads.slice(i, i + TRIAGE_BATCH_SIZE);
    const part = await triageChunk(chunk);
    out.push(...part);
  }
  return out;
}
