/**
 * Deterministic verifier for Demand Contract v1.
 *
 * The model proposes; this file decides. A proposed value survives only when
 *   1. its evidence occurs verbatim in the inquiry text the model was shown, and
 *   2. the value can be read back out of that evidence (a number in the quote,
 *      a keyword for the enum, the place name in the quote).
 * Anything else becomes an explicit unknown with the reason recorded. This is
 * where AP-001 is enforced — in code, not in a prompt the model may ignore.
 */

import {
  DEMAND_FIELDS,
  ENUM_VALUES,
  NUMERIC_BOUNDS,
  NUMERIC_FIELDS,
  emptyDemand,
  unknownField,
  type Demand,
  type DemandField,
  type DemandFieldName,
} from "./contract";

export const MIN_CONFIDENCE = 0.5;
export const MAX_EVIDENCE_CHARS = 200;

/** Lowercase, strip diacritics, collapse whitespace. Used for matching only. */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[  ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function evidenceInText(evidence: string, text: string): boolean {
  const e = normalize(evidence);
  return e.length > 0 && normalize(text).includes(e);
}

/**
 * Every number a human could mean in the quote: "250 000 €", "250.000",
 * "250k", "250 tis.", "1,2 mil", "2,5 mil. eur". Returns plain numbers.
 */
export function numbersInEvidence(evidence: string): number[] {
  const s = normalize(evidence);
  const out: number[] = [];
  const re = /(\d{1,3}(?:[ .]\d{3})+|\d+(?:[.,]\d+)?)\s*(mil(?:ion|\.)?[a-z]*|tis(?:ic|\.)?[a-z]*|k\b)?/g;
  for (const m of s.matchAll(re)) {
    const raw = m[1];
    const unit = m[2] ?? "";
    let n: number;
    if (/^\d{1,3}(?:[ .]\d{3})+$/.test(raw)) {
      n = Number(raw.replace(/[ .]/g, ""));
    } else {
      n = Number(raw.replace(",", "."));
    }
    if (!Number.isFinite(n)) continue;
    if (unit.startsWith("mil")) n *= 1_000_000;
    else if (unit.startsWith("tis") || unit === "k") n *= 1_000;
    out.push(Math.round(n));
  }
  return out;
}

/** Room counts stated in the quote: "3-izbový", "3 izby", "2+1", "garsónka" = 1. */
export function roomsInEvidence(evidence: string): number[] {
  const s = normalize(evidence);
  const out: number[] = [];
  for (const m of s.matchAll(/(\d{1,2})\s*-?\s*izb/g)) out.push(Number(m[1]));
  for (const m of s.matchAll(/(\d{1,2})\s*\+\s*(?:1|kk)\b/g)) out.push(Number(m[1]));
  if (/garson|garzon|jednoizb/.test(s)) out.push(1);
  if (/dvojizb/.test(s)) out.push(2);
  if (/trojizb/.test(s)) out.push(3);
  if (/stvorizb/.test(s)) out.push(4);
  return out;
}

/** Areas stated in the quote: "60 m2", "60m²", "60 metrov". */
export function areasInEvidence(evidence: string): number[] {
  const s = normalize(evidence);
  const out: number[] = [];
  for (const m of s.matchAll(/(\d{1,6}(?:[.,]\d+)?)\s*(?:m2|m²|m\^2|metr|stvorc)/g)) {
    out.push(Math.round(Number(m[1].replace(",", "."))));
  }
  return out;
}

const ENUM_KEYWORDS: Record<string, Record<string, RegExp>> = {
  property_type: {
    byt: /\bbyt|garson|garzon|apartman|\d\s*-?\s*izb|izbov/,
    dom: /\bdom\b|\bdomu\b|\bdomy\b|\bdomcek|rodinn|novostavb/,
    pozemok: /pozem|parcel/,
    chata: /\bchat|chalup/,
    komercny: /kancelar|obchodn|komercn|prevadzk|sklad|nebytov/,
    garaz: /garaz|parkovac/,
  },
  disposition: {
    kupa: /\bkup|\bkupi|zakup/,
    prenajom: /prenaj|\bnajom|podnaj/,
    predaj: /\bpreda/,
    prenajimanie: /prenaj|\bnajom/,
  },
  financing: {
    hypoteka: /hypot|\buver/,
    hotovost: /hotovost|\bcash|vlastn/,
    kombinacia: /hypot|\buver|hotovost|vlastn/,
  },
  urgency: {
    ihned: /ihned|\bhned|co najskor|urgent|surne|asap|tento tyzden|okamzit/,
    do_3_mesiacov: /mesia|tyzd|\bdo \w+|leto|jesen|zim|jar/,
    neskor: /rok|neskor|nesurn|zatial len|buduc|\bcas\b/,
  },
};

function tokensOf(value: string): string[] {
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
}

type Proposal = { value?: unknown; confidence?: unknown; evidence?: unknown };

function checkValue(field: DemandFieldName, value: unknown, evidence: string): unknown | null {
  if (NUMERIC_FIELDS.has(field)) {
    const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (!Number.isFinite(n)) return null;
    const bounds = NUMERIC_BOUNDS[field];
    if (bounds && (n < bounds[0] || n > bounds[1])) return null;
    const found = field.startsWith("rooms")
      ? roomsInEvidence(evidence)
      : field.startsWith("area")
        ? areasInEvidence(evidence)
        : numbersInEvidence(evidence);
    return found.includes(Math.round(n)) ? Math.round(n) : undefined;
  }
  if (typeof value !== "string" || value.trim() === "") return null;
  const allowed = ENUM_VALUES[field];
  if (allowed) {
    if (!allowed.includes(value)) return null;
    const kw = ENUM_KEYWORDS[field]?.[value];
    return kw && kw.test(normalize(evidence)) ? value : undefined;
  }
  // free text (location): every meaningful token of the value must be in the quote
  const tokens = tokensOf(value);
  if (tokens.length === 0) return null;
  const ev = normalize(evidence);
  return tokens.every((t) => ev.includes(t)) ? value.trim().slice(0, 120) : undefined;
}

export function verifyField<T>(
  field: DemandFieldName,
  proposal: Proposal | null | undefined,
  text: string,
): DemandField<T> {
  if (!proposal || proposal.value === null || proposal.value === undefined) return unknownField();
  const evidence = typeof proposal.evidence === "string" ? proposal.evidence.trim() : "";
  if (!evidence || evidence.length > MAX_EVIDENCE_CHARS || !evidenceInText(evidence, text)) {
    return unknownField("evidence_not_in_text");
  }
  const confidence = typeof proposal.confidence === "number" ? proposal.confidence : NaN;
  if (!Number.isFinite(confidence) || confidence < MIN_CONFIDENCE) {
    return unknownField("low_confidence");
  }
  const checked = checkValue(field, proposal.value, evidence);
  if (checked === null) return unknownField("invalid_value");
  if (checked === undefined) return unknownField("value_not_in_evidence");
  return {
    value: checked as T,
    confidence: Math.min(1, confidence),
    source: "inquiry_text",
    evidence,
  };
}

/** min must not exceed max; if it does, both are dropped rather than swapped. */
function enforceRanges(d: Demand): Demand {
  for (const [lo, hi] of [
    ["budget_min", "budget_max"],
    ["rooms_min", "rooms_max"],
    ["area_min", "area_max"],
  ] as const) {
    const a = d[lo].value;
    const b = d[hi].value;
    if (a !== null && b !== null && a > b) {
      d[lo] = unknownField("invalid_value");
      d[hi] = unknownField("invalid_value");
    }
  }
  return d;
}

/**
 * Turn whatever the model returned into a verified Demand. Unknown keys are
 * ignored; a non-object input yields an all-unknown demand.
 */
export function verifyProposal(raw: unknown, text: string): Demand {
  const demand = emptyDemand();
  if (!raw || typeof raw !== "object") return demand;
  const obj = raw as Record<string, Proposal>;
  for (const f of DEMAND_FIELDS) {
    (demand as Record<DemandFieldName, DemandField<unknown>>)[f] = verifyField(f, obj[f], text);
  }
  return enforceRanges(demand);
}
