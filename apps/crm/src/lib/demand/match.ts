/**
 * DEMAND-D4 — matching on verified demand only.
 *
 * Spec: docs/architecture/matching-input-contract-v1.md. The one rule that
 * matters: the lead side comes ONLY from a Demand Contract v1 record, never
 * from `leads.property_type/rooms/financing/timeline` (pre-filled defaults on
 * four code paths) and never from a fallback value.
 *
 * Per field the outcome is match / mismatch / unknown. Unknown neither adds nor
 * subtracts. Every match carries the lead's evidence quote and the property's
 * value, so the broker sees WHY — not a bare score.
 */

import { DEMAND_FIELDS, type Demand, type DemandField, type DemandFieldName, type PropertyType } from "./contract";
import { normalize } from "./verify";

export const DEMAND_MATCH_ENGINE = "demand-match:v1";
export const MIN_SCORE = 0.6;
export const MAX_MATCHES = 10;
/** A listing up to 10 % over budget is shown as a budget mismatch; beyond, dropped. */
export const BUDGET_TOLERANCE = 0.1;

export type PropertyForMatch = {
  id: string;
  type: string | null;
  location: string | null;
  price: number | null;
  rooms_count: number | null;
  usable_area: number | null;
  transaction_type: string | null;
  status: string | null;
};

export type FieldStatus = "match" | "mismatch" | "unknown";

export type FieldOutcome = {
  status: FieldStatus;
  lead_value?: unknown;
  lead_evidence?: string | null;
  property_value?: unknown;
};

export type DemandMatch = {
  property_id: string;
  score: number;
  fields: Partial<Record<DemandFieldName | "transaction", FieldOutcome>>;
};

export type MatchRun =
  | { ok: true; matches: DemandMatch[]; considered: number }
  | { ok: false; reason: "insufficient_demand" | "not_a_buyer"; matches: []; considered: 0 };

/** Property `type` as stored (Realvia/manual) → contract enum. Unmapped = unknown. */
const PROPERTY_TYPE_MAP: Record<string, PropertyType> = {
  byt: "byt",
  garsonka: "byt",
  dom: "dom",
  "rodinny dom": "dom",
  pozemok: "pozemok",
  chata: "chata",
  komercna: "komercny",
  "komercny priestor": "komercny",
  garaz: "garaz",
};

export function propertyTypeOf(raw: string | null): PropertyType | null {
  return PROPERTY_TYPE_MAP[normalize(raw ?? "")] ?? null;
}

const ACTIVE = new Set(["aktivna", "active"]);

function tokens(s: string): string[] {
  return normalize(s).split(/[^a-z0-9]+/).filter((t) => t.length >= 3);
}

/**
 * Every place-token the lead wrote must appear in the listing's location.
 * Slovak inflects place names ("v Košiciach" / "Košice"), so two tokens also
 * match when both are ≥ 5 chars and share the first 5 — enough for
 * kosic-e/kosic-iach, petrz-alka/petrz-alke, and too long for accidental hits.
 */
export function locationMatches(leadLocation: string, propertyLocation: string): boolean {
  const want = tokens(leadLocation);
  const have = tokens(propertyLocation);
  if (want.length === 0 || have.length === 0) return false;
  return want.every((w) =>
    have.some((h) => h === w || (w.length >= 5 && h.length >= 5 && w.slice(0, 5) === h.slice(0, 5))),
  );
}

function known<T>(f: DemandField<T>): f is DemandField<T> & { value: T } {
  return f.value !== null && f.rejected === undefined && typeof f.evidence === "string" && f.evidence.length > 0;
}

function lead<T>(f: DemandField<T>): Pick<FieldOutcome, "lead_value" | "lead_evidence"> {
  return { lead_value: f.value, lead_evidence: f.evidence };
}

function range(value: number | null, min: DemandField<number>, max: DemandField<number>): FieldStatus {
  const lo = known(min) ? min.value : null;
  const hi = known(max) ? max.value : null;
  if (value === null || (lo === null && hi === null)) return "unknown";
  if (lo !== null && value < lo) return "mismatch";
  if (hi !== null && value > hi) return "mismatch";
  return "match";
}

/** Minimal demand (contract §3.2): property_type + (location or budget_max). */
export function hasMinimalDemand(d: Demand): boolean {
  return known(d.property_type) && (known(d.location) || known(d.budget_max));
}

function evaluate(d: Demand, p: PropertyForMatch): DemandMatch | null {
  if (!ACTIVE.has(normalize(p.status ?? ""))) return null;

  const fields: DemandMatch["fields"] = {};

  // Type is a hard requirement: an unknown listing type cannot be claimed a match.
  const ptype = propertyTypeOf(p.type);
  if (ptype !== d.property_type.value) return null;
  fields.property_type = { status: "match", ...lead(d.property_type), property_value: p.type };

  // Transaction: a buyer wants "Predaj", a renter "Prenájom"; a "Dopyt" row is demand, not supply.
  const tx = normalize(p.transaction_type ?? "");
  if (tx === "dopyt") return null;
  if (known(d.disposition) && tx) {
    const want = d.disposition.value === "kupa" ? "predaj" : "prenajom";
    if (tx !== want) return null;
    fields.transaction = { status: "match", ...lead(d.disposition), property_value: p.transaction_type };
  } else {
    fields.transaction = { status: "unknown", property_value: p.transaction_type ?? null };
  }

  let coreMatched = 0;

  if (known(d.location)) {
    if (!p.location || !locationMatches(d.location.value, p.location)) return null;
    fields.location = { status: "match", ...lead(d.location), property_value: p.location };
    coreMatched++;
  } else {
    fields.location = { status: "unknown", property_value: p.location };
  }

  if (known(d.budget_max) && p.price && p.price > 0) {
    if (p.price > d.budget_max.value * (1 + BUDGET_TOLERANCE)) return null;
    const ok = p.price <= d.budget_max.value;
    fields.budget_max = { status: ok ? "match" : "mismatch", ...lead(d.budget_max), property_value: p.price };
    if (ok) coreMatched++;
  } else {
    // No 180 000 € fallback: an unpriced listing or an unstated budget stays unknown.
    fields.budget_max = { status: "unknown", ...(known(d.budget_max) ? lead(d.budget_max) : {}), property_value: p.price ?? null };
  }

  // Type alone is too weak to call it a match (contract §3.2).
  if (coreMatched === 0) return null;

  const rooms = range(p.rooms_count, d.rooms_min, d.rooms_max);
  fields.rooms_min = {
    status: rooms,
    ...(known(d.rooms_min) ? lead(d.rooms_min) : known(d.rooms_max) ? lead(d.rooms_max) : {}),
    property_value: p.rooms_count,
  };
  const area = range(p.usable_area, d.area_min, d.area_max);
  fields.area_min = {
    status: area,
    ...(known(d.area_min) ? lead(d.area_min) : known(d.area_max) ? lead(d.area_max) : {}),
    property_value: p.usable_area,
  };

  const statuses = Object.values(fields).map((f) => f!.status);
  const matched = statuses.filter((s) => s === "match").length;
  const mismatched = statuses.filter((s) => s === "mismatch").length;
  const score = Math.round((matched / (matched + mismatched)) * 1000) / 1000;
  if (score < MIN_SCORE) return null;
  return { property_id: p.id, score, fields };
}

export function matchDemand(d: Demand, properties: PropertyForMatch[]): MatchRun {
  if (known(d.disposition) && (d.disposition.value === "predaj" || d.disposition.value === "prenajimanie")) {
    return { ok: false, reason: "not_a_buyer", matches: [], considered: 0 };
  }
  if (!hasMinimalDemand(d)) return { ok: false, reason: "insufficient_demand", matches: [], considered: 0 };
  const matches = properties
    .map((p) => evaluate(d, p))
    .filter((m): m is DemandMatch => m !== null)
    .sort((a, b) => b.score - a.score || a.property_id.localeCompare(b.property_id))
    .slice(0, MAX_MATCHES);
  return { ok: true, matches, considered: properties.length };
}

/** Fields that D4 reads — kept next to the engine so a new one cannot slip in unverified. */
export const MATCH_INPUT_FIELDS: readonly DemandFieldName[] = DEMAND_FIELDS.filter((f) =>
  ["property_type", "location", "budget_max", "rooms_min", "rooms_max", "area_min", "area_max", "disposition"].includes(f),
);
