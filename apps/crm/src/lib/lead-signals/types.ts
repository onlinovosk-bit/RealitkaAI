/**
 * Seller signals extracted from unstructured lead text.
 *
 * These are the INPUT to scoring, never the decision itself. The engine
 * contract (`docs/architecture/lead-revenue-engine-v1.md` §5) puts the LLM
 * here and nowhere else: it may read a sentence and say what it found, but
 * readiness and qualification are computed from what it stored, by rules.
 *
 * The scope is deliberately four signals. A thirty-factor model cannot be
 * argued with by a broker looking at one lead, and nothing downstream needs
 * more than this to be useful.
 */

/** The closed set. Adding one is a versioned change, not a config tweak. */
export const SIGNAL_NAMES = ["seller_intent", "property_type", "locality", "timeframe"] as const;
export type SignalName = (typeof SIGNAL_NAMES)[number];

export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

/**
 * What the extractor claims it found.
 *
 * `evidence_span` must be a verbatim quote from `source_field`. It is not
 * decoration: §5.1 of the contract makes a signal without it unusable, and
 * `verifyEvidence` checks the quote is really there rather than trusting it.
 */
export interface ExtractedSignal {
  name: SignalName;
  /** `null` means the extractor looked and found nothing. */
  value: string | null;
  confidence: Confidence;
  /** Verbatim quote supporting `value`. `null` when `value` is `null`. */
  evidenceSpan: string | null;
  /** Which field of the lead the quote came from, e.g. `message`. */
  sourceField: string;
}

/** A signal as stored, with the provenance that lets it be re-scored later. */
export interface StoredSignal extends ExtractedSignal {
  leadId: string;
  agencyId: string;
  extractionVersion: string;
  extractedAt: string;
}

/**
 * Three states, mirroring the contact-event substrate.
 *
 * `absent` means the extractor looked and found nothing — a real finding.
 * `unknown` means we cannot tell, including when a value arrived without
 * usable evidence. Scoring treats the two differently and must never collapse
 * them.
 */
export type SignalPresence = "present" | "absent" | "unknown";

export class SignalContractError extends Error {
  readonly signal: string;

  constructor(signal: string, message: string) {
    super(`${signal}: ${message}`);
    this.name = "SignalContractError";
    this.signal = signal;
  }
}
