/**
 * W1 — batch Haiku triage (10–20 leadov). Výstup uložený ako ai_priority + ai_reason (SK).
 */
import { callClaude, CLAUDE_HAIKU, extractJson } from "@/lib/ai/claude";
import { normalizeAiPriority, type AiPrioritySk } from "@/lib/workflows/lead-ai-priority";

export const TRIAGE_BATCH_SIZE = 18;

export type TriageLeadInput = {
  id: string;
  name: string;
  status: string;
  score: number;
  last_contact?: string | null;
  note?: string | null;
  source?: string | null;
};

export type LeadTriageOutput = {
  lead_id: string;
  priority: AiPrioritySk;
  reason: string;
};

const SYSTEM = `Si strategický asistent slovenskej realitnej kancelárie.
Tvoja úloha: pre každého leada v batchi vybrať práve jednu prioritu práce na **dnes**.
Hodnoty priority sú VŽDY práve jedna z: \"Vysoká\", \"Stredná\", \"Nízka\" (presne takto napísané).
\"reason\": jedna krátka veta po slovensky — konkrétne, nie vágna.
Vráť výhradne validný JSON pole objektov, bez markdown.`;

async function triageChunk(leads: TriageLeadInput[]): Promise<LeadTriageOutput[]> {
  if (leads.length === 0) return [];

  const compact = leads.map((l) => ({
    id: l.id,
    name: l.name,
    status: l.status,
    score: l.score,
    last_contact: (l.last_contact ?? "").slice(0, 120),
    note: (l.note ?? "").slice(0, 400),
    source: (l.source ?? "").slice(0, 80),
  }));

  const response = await callClaude({
    model: CLAUDE_HAIKU,
    max_tokens: Math.min(1200, 80 * leads.length + 120),
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: `Ohodnoť naraz prioritizáciu pre dnešný deň (realitný maklér).\n${JSON.stringify(compact, null, 2)}\n\nVráť JSON pole:\n[{"lead_id":"<uuid>","priority":"Vysoká"|"Stredná"|"Nízka","reason":"..."}, ...]\nMusíš vrátiť presne jeden záznam pre každé id zo vstupu (${leads.map((x) => x.id).join(", ")}).`,
      },
    ],
  });

  const raw =
    response.content?.[0]?.type === "text" ? (response.content[0] as { text: string }).text : "[]";
  let parsed: LeadTriageOutput[];
  try {
    parsed = extractJson<LeadTriageOutput[]>(raw);
  } catch {
    return leads.map((l) => ({
      lead_id: l.id,
      priority: "Stredná",
      reason: "Automatická záloha — model nevrátil platný výstup.",
    }));
  }

  const byId = new Map(parsed.map((p) => [p.lead_id, p]));
  return leads.map((l) => {
    const row = byId.get(l.id);
    if (!row) {
      return {
        lead_id: l.id,
        priority: "Stredná" as AiPrioritySk,
        reason: "Chýbal záznam v batch výstupe.",
      };
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
