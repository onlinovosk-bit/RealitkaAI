/**
 * Demand extraction: inquiry text → verified Demand Contract v1 record.
 *
 * The model (Haiku, per the routing rule for analysis tasks) only proposes
 * values with quotes. `verifyProposal` keeps what the quote proves and turns the
 * rest into explicit unknowns. Every failure mode returns a record with a
 * status, never a throw, so an ingestion path can call this without a try.
 */

import type Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_HAIKU, callClaude, extractJson } from "@/lib/ai/claude";
import {
  DEMAND_CONTRACT_VERSION,
  emptyDemand,
  type DemandRecord,
  type ExtractionStatus,
} from "./contract";
import { redactForModel } from "./redact";
import { verifyProposal } from "./verify";

export const EXTRACTOR_ID = `llm:${CLAUDE_HAIKU}+verify:v1`;
export const MIN_INQUIRY_CHARS = 12;

const SYSTEM_PROMPT = `Si extraktor dopytu pre realitnú kanceláriu na Slovensku.
Dostaneš text správy od záujemcu. Vráť IBA JSON objekt s kľúčmi:
property_type, location, budget_min, budget_max, rooms_min, rooms_max, area_min, area_max, disposition, urgency, financing.

Každý kľúč má hodnotu {"value": ..., "confidence": 0..1, "evidence": "..."} alebo null.

Pravidlá:
- Zapíš iba to, čo záujemca v texte VÝSLOVNE uviedol. Ak to neuviedol, daj null. Nehádaj, nedopočítavaj, nepoužívaj bežné hodnoty.
- "evidence" je doslovný, čo najkratší úsek z textu (skopírovaný presne, vrátane diakritiky), z ktorého hodnota vyplýva.
- Placeholdery ako [MENO], [EMAIL_1], [PHONE_1] nie sú dopyt.
- Záujem o konkrétny inzerát ("mám záujem o tento byt") nie je lokalita ani rozpočet, ak ich záujemca sám nenapísal.
- property_type: jedna z byt | dom | pozemok | chata | komercny | garaz.
- disposition: kupa (chce kúpiť) | prenajom (chce si prenajať) | predaj (chce predať) | prenajimanie (chce prenajať svoju nehnuteľnosť).
- urgency: ihned | do_3_mesiacov | neskor.
- financing: hypoteka | hotovost | kombinacia.
- budget_* v eurách ako číslo (250000, nie "250k"). "do X" alebo "okolo X" → budget_max. "od X do Y" → budget_min aj budget_max.
- rooms_* ako počet izieb (garsónka = 1). area_* v m².
- location: miesto, kde chce záujemca nehnuteľnosť, tak ako ho napísal (mesto, časť, okres).
- confidence: 1 = doslovne uvedené, 0.7 = jasné z kontextu vety, pod 0.5 radšej null.

Odpoveď je len JSON, bez textu okolo.`;

export type ClaudeCall = (
  params: Anthropic.MessageCreateParamsNonStreaming,
  tag?: string,
) => Promise<Anthropic.Message>;

export type ExtractInput = {
  /** The inquirer's own words — NOT the stored note with our annotations. */
  inquiryText: string;
  leadName?: string | null;
};

function record(status: ExtractionStatus, inputChars: number, demand = emptyDemand()): DemandRecord {
  return {
    contract_version: DEMAND_CONTRACT_VERSION,
    status,
    demand,
    extractor: EXTRACTOR_ID,
    input_chars: inputChars,
    extracted_at: new Date().toISOString(),
  };
}

export async function extractDemand(
  input: ExtractInput,
  call: ClaudeCall = callClaude,
): Promise<DemandRecord> {
  const text = redactForModel(input.inquiryText ?? "", input.leadName);
  if (text.replace(/\[[A-Z_0-9]+\]/g, "").trim().length < MIN_INQUIRY_CHARS) {
    return record("no_text", text.length);
  }

  let message: Anthropic.Message;
  try {
    message = await call(
      {
        model: CLAUDE_HAIKU,
        max_tokens: 1500,
        temperature: 0,
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: `Text správy:\n"""\n${text}\n"""` }],
      },
      "demand-extract",
    );
  } catch (e) {
    console.error("[demand.extract] llm_error", e instanceof Error ? e.message : String(e));
    return record("llm_error", text.length);
  }

  if (message.stop_reason !== "end_turn") {
    return record("invalid_output", text.length);
  }
  const body = message.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();

  let parsed: unknown;
  try {
    parsed = extractJson<unknown>(body);
  } catch {
    return record("invalid_output", text.length);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return record("invalid_output", text.length);
  }
  return record("ok", text.length, verifyProposal(parsed, text));
}
