/**
 * Demand Contract v1 — what a lead is looking for, and only what they said.
 *
 * Every field carries the value AND the proof. A value without evidence that can
 * be found verbatim in the lead's own words is not a value; it is a guess, and
 * AP-001 forbids guesses. The unknown state is explicit (`value: null`,
 * `evidence: null`, `confidence: 0`), never an empty string or a default like
 * "Byt" / "Hypotéka", which is what `acquire/email` used to write for every lead.
 */

export const DEMAND_CONTRACT_VERSION = "v1" as const;

export const PROPERTY_TYPES = ["byt", "dom", "pozemok", "chata", "komercny", "garaz"] as const;
export const DISPOSITIONS = ["kupa", "prenajom", "predaj", "prenajimanie"] as const;
export const URGENCIES = ["ihned", "do_3_mesiacov", "neskor"] as const;
export const FINANCING = ["hypoteka", "hotovost", "kombinacia"] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];
export type Disposition = (typeof DISPOSITIONS)[number];
export type Urgency = (typeof URGENCIES)[number];
export type Financing = (typeof FINANCING)[number];

/** Where the evidence was found. Only the inquirer's own text counts. */
export type EvidenceSource = "inquiry_text";

export type DemandField<T> = {
  value: T | null;
  /** 0..1. 0 exactly when value is null. */
  confidence: number;
  source: EvidenceSource | null;
  /** Verbatim substring of the (redacted) inquiry text. */
  evidence: string | null;
  /** Set when a model proposed a value that failed verification. */
  rejected?: RejectReason;
};

export type RejectReason =
  | "evidence_not_in_text"
  | "value_not_in_evidence"
  | "invalid_value"
  | "low_confidence";

export type Demand = {
  property_type: DemandField<PropertyType>;
  location: DemandField<string>;
  budget_min: DemandField<number>;
  budget_max: DemandField<number>;
  rooms_min: DemandField<number>;
  rooms_max: DemandField<number>;
  area_min: DemandField<number>;
  area_max: DemandField<number>;
  disposition: DemandField<Disposition>;
  urgency: DemandField<Urgency>;
  financing: DemandField<Financing>;
};

export type DemandFieldName = keyof Demand;

export const DEMAND_FIELDS: readonly DemandFieldName[] = [
  "property_type",
  "location",
  "budget_min",
  "budget_max",
  "rooms_min",
  "rooms_max",
  "area_min",
  "area_max",
  "disposition",
  "urgency",
  "financing",
];

export const NUMERIC_FIELDS: ReadonlySet<DemandFieldName> = new Set([
  "budget_min",
  "budget_max",
  "rooms_min",
  "rooms_max",
  "area_min",
  "area_max",
]);

export const ENUM_VALUES: Partial<Record<DemandFieldName, readonly string[]>> = {
  property_type: PROPERTY_TYPES,
  disposition: DISPOSITIONS,
  urgency: URGENCIES,
  financing: FINANCING,
};

/** Numeric sanity bounds. Outside them the value is rejected, not clamped. */
export const NUMERIC_BOUNDS: Partial<Record<DemandFieldName, [number, number]>> = {
  budget_min: [1_000, 50_000_000],
  budget_max: [1_000, 50_000_000],
  rooms_min: [1, 20],
  rooms_max: [1, 20],
  area_min: [5, 100_000],
  area_max: [5, 100_000],
};

export function unknownField<T>(rejected?: RejectReason): DemandField<T> {
  return rejected
    ? { value: null, confidence: 0, source: null, evidence: null, rejected }
    : { value: null, confidence: 0, source: null, evidence: null };
}

export function emptyDemand(): Demand {
  return Object.fromEntries(DEMAND_FIELDS.map((f) => [f, unknownField()])) as Demand;
}

/** Fields the core of matching needs. A record is "complete" when all are known. */
export const CORE_FIELDS: readonly DemandFieldName[] = ["property_type", "location", "budget_max"];

export function knownFields(d: Demand): DemandFieldName[] {
  return DEMAND_FIELDS.filter((f) => d[f].value !== null);
}

export function isCoreComplete(d: Demand): boolean {
  return CORE_FIELDS.every((f) => d[f].value !== null);
}

/**
 * Outcome of one extraction attempt. `status` distinguishes "the lead said
 * nothing about demand" (ok, zero known fields) from "we could not tell"
 * (no_text / llm_error / invalid_output) — the KPI must not count the second
 * kind as a valid demand record.
 */
export type ExtractionStatus = "ok" | "no_text" | "llm_error" | "invalid_output" | "disabled";

export type DemandRecord = {
  contract_version: typeof DEMAND_CONTRACT_VERSION;
  status: ExtractionStatus;
  demand: Demand;
  extractor: string;
  input_chars: number;
  extracted_at: string;
};
