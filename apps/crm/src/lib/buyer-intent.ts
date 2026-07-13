// ─── Enums ────────────────────────────────────────────────────────────────────

export type DealType = "buy" | "rent" | "sell";

export type PropertyType = "flat" | "house" | "land" | "commercial";

export type TimeHorizon =
  | "0-3"   // ihneď / do 3 mesiacov
  | "3-6"
  | "6-12"
  | "12+";

export type BuyerSegment =
  | "first_time_buyer"
  | "investor"
  | "relocator"
  | "renter"
  | "seller"
  | "other";

// ─── Core models ──────────────────────────────────────────────────────────────

/**
 * Normalized buyer intent — source of truth for matching and CRM.
 * Stored in DB table `buyer_intents`.
 */
export type BuyerIntent = {
  id: string;                        // uuid
  leadId: string;                    // FK → leads.id

  // structured preferences
  dealType: DealType;
  propertyType: PropertyType;
  primaryCity: string;
  budgetMin: number;                 // EUR
  budgetMax: number;                 // EUR
  timeHorizonMonths: TimeHorizon;

  // optional flags (ML-friendly booleans)
  newBuildOnly: boolean;
  needsMortgageHelp: boolean;

  // free text — for AI + agent context
  rawFocusText: string;

  // derived fields (computed on write, updated on behavior events)
  clientSegment: BuyerSegment;
  buyerReadinessScore: number;       // 0–100

  createdAt: string;
  updatedAt: string;
};

/**
 * Input from onboarding form (before DB write).
 */
export type BuyerIntentInput = Omit<
  BuyerIntent,
  "id" | "leadId" | "clientSegment" | "buyerReadinessScore" | "createdAt" | "updatedAt"
>;

/**
 * URL query params passed to /nehnutelnosti after onboarding.
 * Raw focus text is NEVER put in the URL — use intentId instead.
 */
export type PropertySearchParams = {
  dealType?: DealType;
  property?: PropertyType;
  city?: string;
  budgetMin?: string;   // string — URL param
  budgetMax?: string;
  intentId?: string;    // optional — triggers deeper personalization
};

// ─── Scoring ──────────────────────────────────────────────────────────────────

/**
 * Heuristic buyer readiness score (0–100).
 * Replace with ML model later — keep signature stable.
 */
export function computeBuyerReadinessScore(input: BuyerIntentInput): number {
  let score = 0;

  // time horizon (urgency)
  const horizonScore: Record<TimeHorizon, number> = {
    "0-3":  40,
    "3-6":  28,
    "6-12": 16,
    "12+":   8,
  };
  score += horizonScore[input.timeHorizonMonths] ?? 8;

  // budget defined (both ends)
  if (input.budgetMin > 0) score += 10;
  if (input.budgetMax > 0 && input.budgetMax > input.budgetMin) score += 10;

  // city specified
  if (input.primaryCity.trim().length > 0) score += 10;

  // mortgage help → first-time buyer signal (engaged)
  if (input.needsMortgageHelp) score += 8;

  // free text filled in (intent clarity)
  if (input.rawFocusText.trim().length > 20) score += 12;
  else if (input.rawFocusText.trim().length > 0) score += 5;

  // new build only → specific preference = higher readiness
  if (input.newBuildOnly) score += 5;

  // sell intent = already motivated
  if (input.dealType === "sell") score += 5;

  return Math.min(score, 100);
}

/**
 * Derive client segment from onboarding answers.
 */
export function deriveClientSegment(input: BuyerIntentInput): BuyerSegment {
  if (input.dealType === "sell") return "seller";
  if (input.dealType === "rent") return "renter";

  // buy
  if (input.needsMortgageHelp) return "first_time_buyer";

  // investor signal: short horizon + no mortgage + high budget
  if (
    input.timeHorizonMonths === "0-3" &&
    !input.needsMortgageHelp &&
    input.budgetMax > 200_000
  ) return "investor";

  // relocator: has city + moderate timeline
  if (input.primaryCity.trim().length > 0 && input.timeHorizonMonths !== "12+") {
    return "relocator";
  }

  return "other";
}

// ─── Behavior events (foundation for ML) ────────────────────────────────────

export type BuyerEventType =
  | "property_view"
  | "property_save"
  | "contact_request"
  | "showing_request"
  | "offer_submitted"
  | "session_start";

export type BuyerEvent = {
  id: string;
  intentId: string;      // FK → buyer_intents.id
  leadId: string | null;
  eventType: BuyerEventType;
  propertyId: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
};

// ─── SK ↔ EN property type (leads table uses SK labels) ─────────────────────

/** SK label stored on `leads.property_type` for each canonical intent type. */
export const INTENT_TO_SK_PROPERTY_TYPE: Record<PropertyType, string> = {
  flat: "Byt",
  house: "Dom",
  land: "Pozemok",
  commercial: "Komerčný priestor",
};

const SK_PROPERTY_TYPE_ALIASES: Record<string, PropertyType> = {
  byt: "flat",
  dom: "house",
  pozemok: "land",
  komerčný: "commercial",
  komercny: "commercial",
  "komerčný priestor": "commercial",
  "komerčné priestory": "commercial",
  flat: "flat",
  house: "house",
  land: "land",
  commercial: "commercial",
  apartment: "flat",
};

/**
 * Map `leads.property_type` (SK free text) → buyer_intents.property_type (EN).
 * Returns null when input is empty or not a known dwelling type (no guessing).
 */
export function mapSkPropertyTypeToIntent(raw: string | null | undefined): PropertyType | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;

  const normalized = trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return SK_PROPERTY_TYPE_ALIASES[normalized] ?? null;
}

/** Map onboarding / intent EN type → SK label for `leads.property_type`. */
export function mapIntentPropertyTypeToSk(type: PropertyType): string {
  return INTENT_TO_SK_PROPERTY_TYPE[type];
}

/** Infer deal_type from lead CRM fields — defaults to null when ambiguous. */
export function inferDealTypeFromLeadFields(input: {
  propertyType?: string | null;
  financing?: string | null;
  status?: string | null;
}): DealType | null {
  const prop = String(input.propertyType ?? "").trim().toLowerCase();
  if (prop === "predaj" || prop === "predávam" || prop === "predavam") return "sell";

  const financing = String(input.financing ?? "").trim().toLowerCase();
  if (financing.includes("nájom") || financing.includes("najom") || financing.includes("prenájom")) {
    return "rent";
  }

  const status = String(input.status ?? "").trim().toLowerCase();
  if (status.includes("predáv") || status.includes("predav")) return "sell";

  // Dwelling type on lead (Byt, Dom, …) = explicit buyer search signal
  if (mapSkPropertyTypeToIntent(input.propertyType) !== null) return "buy";

  return null;
}

/** Map CRM timeline text → canonical time horizon bucket. */
export function mapLeadTimelineToHorizon(timeline: string | null | undefined): TimeHorizon {
  const t = String(timeline ?? "").trim().toLowerCase();
  if (!t) return "6-12";
  if (t.includes("ihneď") || t.includes("ihned") || t.includes("okamž") || t.includes("okamz")) {
    return "0-3";
  }
  if (t.includes("3 mes") || t.includes("do 3")) return "3-6";
  if (t.includes("6 mes") || t.includes("do 6")) return "6-12";
  if (t.includes("12") || t.includes("rok")) return "12+";
  return "6-12";
}

/** Parse `leads.budget` free text → EUR min/max (0 when unknown). */
export function parseLeadBudgetString(raw: string | null | undefined): { budgetMin: number; budgetMax: number } {
  const text = String(raw ?? "").trim();
  if (!text) return { budgetMin: 0, budgetMax: 0 };

  const numbers = [...text.matchAll(/(\d[\d\s]*)/g)]
    .map((m) => Number(m[1].replace(/\s/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (numbers.length === 0) return { budgetMin: 0, budgetMax: 0 };
  if (numbers.length === 1) {
    const lower = text.toLowerCase();
    if (lower.includes("od ") || lower.startsWith("od")) {
      return { budgetMin: numbers[0], budgetMax: 0 };
    }
    return { budgetMin: 0, budgetMax: numbers[0] };
  }

  const sorted = [...numbers].sort((a, b) => a - b);
  return { budgetMin: sorted[0], budgetMax: sorted[sorted.length - 1] };
}

export type LeadIntentBackfillRow = {
  id: string;
  name: string;
  email: string | null;
  location: string | null;
  budget: string | null;
  property_type: string | null;
  financing: string | null;
  timeline: string | null;
  status: string | null;
  note: string | null;
  client_segment: string | null;
  buyer_readiness_score: number | null;
};

export type LeadIntentBackfillCandidate = {
  leadId: string;
  skipReason?: string;
  intentInput?: BuyerIntentInput;
  segment?: BuyerSegment;
  readinessScore?: number;
};

/**
 * Build a buyer_intents row from an existing lead (backfill).
 * Skips leads without mappable property_type or inferable deal_type.
 */
export function buildBuyerIntentFromLead(lead: LeadIntentBackfillRow): LeadIntentBackfillCandidate {
  const rawPropertyType = String(lead.property_type ?? "").trim();
  if (!rawPropertyType) {
    return { leadId: lead.id, skipReason: "insufficient_source_data" };
  }

  const propertyType = mapSkPropertyTypeToIntent(rawPropertyType);
  if (!propertyType) {
    return { leadId: lead.id, skipReason: "unmappable_property_type" };
  }

  const dealType = inferDealTypeFromLeadFields({
    propertyType: lead.property_type,
    financing: lead.financing,
    status: lead.status,
  });
  if (!dealType) {
    return { leadId: lead.id, skipReason: "ambiguous_deal_type" };
  }

  const { budgetMin, budgetMax } = parseLeadBudgetString(lead.budget);
  const intentInput: BuyerIntentInput = {
    dealType,
    propertyType,
    primaryCity: String(lead.location ?? "").trim(),
    budgetMin,
    budgetMax,
    timeHorizonMonths: mapLeadTimelineToHorizon(lead.timeline),
    newBuildOnly: false,
    needsMortgageHelp: String(lead.financing ?? "").toLowerCase().includes("hypot"),
    rawFocusText: String(lead.note ?? "").trim(),
  };

  return {
    leadId: lead.id,
    intentInput,
    segment: deriveClientSegment(intentInput),
    readinessScore: computeBuyerReadinessScore(intentInput),
  };
}
