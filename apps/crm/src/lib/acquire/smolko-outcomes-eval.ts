import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { TriageLeadInput } from "@/lib/ai/lead-triage-batch";

export type SmolkoOutcomeRecord = {
  id: string;
  name: string;
  portal: string;
  source: string;
  listing_portal_id: string | null;
  internal_id: string | null;
  inquiry_text: string;
  phone: string | null;
  email: string | null;
  outcome: "prenajate" | "predane";
  intent_signal: "stredny" | "silny" | "slaby";
  inquiry_date: string;
  provenance: string;
};

export const DEFAULT_SMOLKO_OUTCOMES_PATH = resolve(
  process.cwd(),
  "../../data/eval/smolko-outcomes-gold.jsonl",
);

export function loadSmolkoOutcomeRecords(
  filePath: string = DEFAULT_SMOLKO_OUTCOMES_PATH,
): SmolkoOutcomeRecord[] {
  const raw = readFileSync(filePath, "utf8");
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as SmolkoOutcomeRecord);
}

/** Mirrors gateway note shape from email-adapter toLeadCandidate. */
export function buildEvalTriageNote(record: SmolkoOutcomeRecord): string {
  const listingRef =
    record.listing_portal_id ?? record.internal_id ?? "-";
  return `[${record.portal}] ${record.inquiry_text} | inzerát: ${listingRef} | intent: eval-gold (${record.intent_signal})`;
}

export function toTriageLeadInput(record: SmolkoOutcomeRecord): TriageLeadInput {
  return {
    id: record.id,
    name: record.name,
    status: "Nový",
    score: 50,
    last_contact: `Eval gold ${record.inquiry_date}`,
    note: buildEvalTriageNote(record),
    source: record.source,
  };
}

export type EvalReportRow = {
  id: string;
  name: string;
  intent_signal: SmolkoOutcomeRecord["intent_signal"];
  outcome: SmolkoOutcomeRecord["outcome"];
  ai_priority: string;
  ai_reason: string;
  converted: boolean;
};

export function formatEvalReportTable(rows: EvalReportRow[]): string {
  const header =
    "| id | signal | outcome | ai_priority | converted | ai_reason |";
  const sep = "|---|---|---|---|---|---|";
  const body = rows.map(
    (r) =>
      `| ${r.id} | ${r.intent_signal} | ${r.outcome} | ${r.ai_priority} | ${r.converted ? "yes" : "no"} | ${r.ai_reason.replace(/\|/g, "/")} |`,
  );
  return [header, sep, ...body].join("\n");
}
