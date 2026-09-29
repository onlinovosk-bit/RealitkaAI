/**
 * DEMAND-BACKFILL experiment — gold dataset and the production gate.
 *
 * The experiment never writes to the database. It produces a CSV in which a
 * human records, for EVERY lead × field, independently of what the extractor
 * said:
 *   evidence_present  y | n   — does the text state this field explicitly?
 *   gold_value        the value the text states (empty when n)
 *   evidence_span     the words that state it (empty when n)
 *
 * Scoring then separates four outcomes:
 *   correct          extracted, text states it, value matches gold
 *   correct_unknown  not extracted, text does not state it  (NOT an error)
 *   missed           not extracted, text states it
 *   false_value      extracted, but text does not state it, or states another value
 * `unsupported` (extracted where the human says the text states nothing) must be
 * zero for production writes — the verifier is supposed to make it impossible.
 */

import { DEMAND_FIELDS, NUMERIC_FIELDS, type Demand, type DemandFieldName } from "./contract";
import { normalize } from "./verify";

export const LABEL_COLUMNS = [
  "lead_id",
  "field",
  "extracted_value",
  "extracted_evidence",
  "rejected",
  "evidence_present",
  "gold_value",
  "evidence_span",
  "inquiry_text",
] as const;

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function labelRows(leadId: string, demand: Demand, redactedText: string): string[] {
  return DEMAND_FIELDS.map((f, i) => {
    const d = demand[f];
    return [leadId, f, d.value, d.evidence, d.rejected ?? "", "", "", "", i === 0 ? redactedText : ""]
      .map(csvCell)
      .join(",");
  });
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c !== ""));
}

/** Gate groups: the founder's table names "budget" and "rooms", not min/max. */
export const GATE_GROUPS: Record<string, readonly DemandFieldName[]> = {
  location: ["location"],
  budget: ["budget_min", "budget_max"],
  property_type: ["property_type"],
  rooms: ["rooms_min", "rooms_max"],
  disposition: ["disposition"],
};

export const GATE = {
  minPrecision: 0.95,
  maxFalseValueRate: 0.02,
  maxUnsupported: 0,
  /** Fewer labeled extractions than this → INSUFFICIENT, never PASS. */
  minSupport: 10,
} as const;

export type Tally = {
  rows: number;
  labeled: number;
  extracted: number;
  correct: number;
  correct_unknown: number;
  missed: number;
  false_value: number;
  unsupported: number;
  evidence_grounded: number;
};

export type Metrics = Tally & {
  precision: number | null;
  recall: number | null;
  accuracy: number | null;
  false_value_rate: number;
  unknown_rate: number;
};

const zero = (): Tally => ({
  rows: 0, labeled: 0, extracted: 0, correct: 0, correct_unknown: 0,
  missed: 0, false_value: 0, unsupported: 0, evidence_grounded: 0,
});

const ratio = (a: number, b: number): number | null => (b === 0 ? null : a / b);

function sameValue(field: DemandFieldName, extracted: string, gold: string): boolean {
  if (NUMERIC_FIELDS.has(field)) {
    const a = Number(extracted.replace(/[\s.]/g, "").replace(",", "."));
    const b = Number(gold.replace(/[\s.]/g, "").replace(",", "."));
    return Number.isFinite(a) && a === b;
  }
  const a = normalize(extracted);
  const b = normalize(gold);
  return a === b || (a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a)));
}

function overlaps(a: string, b: string): boolean {
  const x = normalize(a);
  const y = normalize(b);
  return x.length > 0 && y.length > 0 && (x.includes(y) || y.includes(x));
}

export function metrics(t: Tally): Metrics {
  return {
    ...t,
    precision: ratio(t.correct, t.correct + t.false_value),
    recall: ratio(t.correct, t.correct + t.missed),
    accuracy: ratio(t.correct + t.correct_unknown, t.labeled),
    false_value_rate: t.labeled === 0 ? 0 : t.false_value / t.labeled,
    unknown_rate: t.rows === 0 ? 0 : (t.rows - t.extracted) / t.rows,
  };
}

function add(a: Tally, b: Tally): Tally {
  const out = zero();
  for (const k of Object.keys(out) as (keyof Tally)[]) out[k] = a[k] + b[k];
  return out;
}

export type GateResult = {
  group: string;
  metrics: Metrics;
  verdict: "PASS" | "FAIL" | "INSUFFICIENT";
  reasons: string[];
};

export type ScoreReport = {
  fields: Record<DemandFieldName, Metrics>;
  gates: GateResult[];
  overall: Metrics;
  verdict: "PASS" | "FAIL" | "INSUFFICIENT";
};

export function scoreLabels(csv: string): ScoreReport {
  const [header, ...body] = parseCsv(csv);
  if (!header) throw new Error("labels CSV is empty");
  const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
  for (const c of ["field", "extracted_value", "extracted_evidence", "evidence_present", "gold_value", "evidence_span"]) {
    if (!(c in idx)) throw new Error(`labels CSV is missing column "${c}"`);
  }
  const tallies = new Map<DemandFieldName, Tally>(DEMAND_FIELDS.map((f) => [f, zero()]));

  for (const r of body) {
    const field = r[idx.field] as DemandFieldName;
    const t = tallies.get(field);
    if (!t) continue;
    const extracted = (r[idx.extracted_value] ?? "").trim();
    const extractedEvidence = (r[idx.extracted_evidence] ?? "").trim();
    const present = (r[idx.evidence_present] ?? "").trim().toLowerCase();
    const gold = (r[idx.gold_value] ?? "").trim();
    const span = (r[idx.evidence_span] ?? "").trim();
    t.rows++;
    if (extracted) t.extracted++;
    if (present !== "y" && present !== "n") continue; // not labeled yet
    t.labeled++;
    if (!extracted) {
      if (present === "n") t.correct_unknown++;
      else t.missed++;
      continue;
    }
    if (present === "n") {
      t.false_value++;
      t.unsupported++;
      continue;
    }
    if (sameValue(field, extracted, gold)) t.correct++;
    else t.false_value++;
    if (overlaps(extractedEvidence, span)) t.evidence_grounded++;
  }

  const fields = Object.fromEntries(
    DEMAND_FIELDS.map((f) => [f, metrics(tallies.get(f)!)]),
  ) as Record<DemandFieldName, Metrics>;

  const gates: GateResult[] = Object.entries(GATE_GROUPS).map(([group, members]) => {
    const m = metrics(members.map((f) => tallies.get(f)!).reduce(add, zero()));
    const reasons: string[] = [];
    const support = m.correct + m.false_value;
    if (m.unsupported > GATE.maxUnsupported) reasons.push(`unsupported=${m.unsupported}`);
    if (m.precision !== null && m.precision < GATE.minPrecision) {
      reasons.push(`precision=${(m.precision * 100).toFixed(1)}%`);
    }
    if (m.false_value_rate > GATE.maxFalseValueRate) {
      reasons.push(`false_value_rate=${(m.false_value_rate * 100).toFixed(1)}%`);
    }
    const verdict = reasons.length > 0 ? "FAIL" : support < GATE.minSupport ? "INSUFFICIENT" : "PASS";
    if (verdict === "INSUFFICIENT") reasons.push(`support=${support} < ${GATE.minSupport}`);
    return { group, metrics: m, verdict, reasons };
  });

  const overall = metrics([...tallies.values()].reduce(add, zero()));
  const overallFail =
    overall.unsupported > GATE.maxUnsupported || overall.false_value_rate > GATE.maxFalseValueRate;
  const verdict = overallFail || gates.some((g) => g.verdict === "FAIL")
    ? "FAIL"
    : gates.some((g) => g.verdict === "INSUFFICIENT")
      ? "INSUFFICIENT"
      : "PASS";
  return { fields, gates, overall, verdict };
}
