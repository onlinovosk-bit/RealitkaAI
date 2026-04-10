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
