/**
 * DEMAND-BACKFILL experiment — labeling sheet and scoring.
 *
 * The experiment never writes to the database. It produces a CSV where a human
 * marks each extracted value `correct` / `wrong` and writes the true value the
 * text states (also where the extractor said unknown). Scoring then gives, per
 * field: precision, recall, unknown rate and false-positive rate — the numbers
 * that decide whether extraction is good enough for production ingestion.
 */

import { DEMAND_FIELDS, type Demand, type DemandFieldName } from "./contract";

export const LABEL_COLUMNS = [
  "lead_id",
  "field",
  "extracted_value",
  "evidence",
  "rejected",
  "judgement",
  "truth_value",
  "inquiry_text",
] as const;

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function labelRows(leadId: string, demand: Demand, redactedText: string): string[] {
  return DEMAND_FIELDS.map((f, i) => {
    const d = demand[f];
    return [
      leadId,
      f,
      d.value,
      d.evidence,
      d.rejected ?? "",
      "",
      "",
      i === 0 ? redactedText : "",
    ]
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

export type FieldScore = {
  field: DemandFieldName;
  rows: number;
  labeled: number;
  extracted: number;
  correct: number;
  wrong: number;
  missed: number;
  unknown_rate: number;
  precision: number | null;
  recall: number | null;
  false_positive_rate: number;
};

const ratio = (a: number, b: number): number | null => (b === 0 ? null : a / b);

/**
 * A row counts only when a human labeled it: `judgement` set for an extracted
 * value, or — for an unknown — `judgement` = "correct" (text really says
 * nothing) or a `truth_value` (text says something the extractor missed).
 */
export function scoreLabels(csv: string): { fields: FieldScore[]; overall: Omit<FieldScore, "field"> } {
  const [header, ...body] = parseCsv(csv);
  if (!header) throw new Error("labels CSV is empty");
  const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
  for (const c of ["field", "extracted_value", "judgement", "truth_value"]) {
    if (!(c in idx)) throw new Error(`labels CSV is missing column "${c}"`);
  }
  const acc = new Map<DemandFieldName, FieldScore>();
  for (const f of DEMAND_FIELDS) {
    acc.set(f, {
      field: f, rows: 0, labeled: 0, extracted: 0, correct: 0, wrong: 0, missed: 0,
      unknown_rate: 0, precision: null, recall: null, false_positive_rate: 0,
    });
  }
  for (const r of body) {
    const s = acc.get(r[idx.field] as DemandFieldName);
    if (!s) continue;
    const extracted = (r[idx.extracted_value] ?? "").trim() !== "";
    const judgement = (r[idx.judgement] ?? "").trim().toLowerCase();
    const truth = (r[idx.truth_value] ?? "").trim();
    s.rows++;
    if (extracted) s.extracted++;
    if (extracted && (judgement === "correct" || judgement === "wrong")) {
      s.labeled++;
      if (judgement === "correct") s.correct++;
      else s.wrong++;
    } else if (!extracted && (judgement === "correct" || truth !== "")) {
      s.labeled++;
      if (truth !== "") s.missed++;
    }
  }
  const finish = (s: Omit<FieldScore, "field">) => {
    s.unknown_rate = s.rows === 0 ? 0 : (s.rows - s.extracted) / s.rows;
    s.precision = ratio(s.correct, s.correct + s.wrong);
    s.recall = ratio(s.correct, s.correct + s.missed);
    s.false_positive_rate = s.labeled === 0 ? 0 : s.wrong / s.labeled;
    return s;
  };
  const fields = [...acc.values()].map((s) => finish(s) as FieldScore);
  const overall = finish(
    fields.reduce(
      (o, s) => ({
        ...o,
        rows: o.rows + s.rows,
        labeled: o.labeled + s.labeled,
        extracted: o.extracted + s.extracted,
        correct: o.correct + s.correct,
        wrong: o.wrong + s.wrong,
        missed: o.missed + s.missed,
      }),
      { rows: 0, labeled: 0, extracted: 0, correct: 0, wrong: 0, missed: 0, unknown_rate: 0, precision: null, recall: null, false_positive_rate: 0 } as Omit<FieldScore, "field">,
    ),
  );
  return { fields, overall };
}
