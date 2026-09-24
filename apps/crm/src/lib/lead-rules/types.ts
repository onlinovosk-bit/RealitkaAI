import type { SignalName, StoredSignal } from "@/lib/lead-signals/types";

/**
 * Deterministic readiness and qualification.
 *
 * This is where the engine contract (§5.3) forbids the model outright. A model
 * may read a sentence and say what it found; it may not decide whether a broker
 * should pick up the phone. The reason is reproducibility: the same lead must
 * get the same answer tomorrow, after a provider swap, after a prompt edit.
 * If the decision lived in a prompt, nothing about a stored score would be
 * true for longer than the model behind it.
 *
 * Every output carries `rulesetVersion`. A score without one cannot be
 * compared to anything, including its own past self.
 */

/** Bump when any weight, threshold or gate below changes. */
export const RULESET_VERSION = "seller-readiness-v1";

/**
 * Facts the CRM knows on its own, without a model reading anything.
 *
 * Kept apart from signals on purpose: these are not extracted, so they cannot
 * be wrong in the way an extraction can, and they never need evidence.
 */
export interface LeadFacts {
  /** A phone number or an email — at least one, or the lead cannot be worked. */
  hasContactPath: boolean;
  /** Explicit opt-out or do-not-contact recorded against the lead. */
  optedOut: boolean;
  /** Broker or system marked this lead as already sold / not interested. */
  hardDisqualifier?: "already_sold" | "not_interested" | "invalid_contact";
  /** Days since the lead was captured. Used for freshness, never for an SLA claim. */
  ageInDays: number;
}

export type ReadinessBand = "hot" | "warm" | "cold";

export interface ReadinessResult {
  score: number;
  band: ReadinessBand;
  /** Machine-readable reasons, in a stable order. Never prose. */
  reasonCodes: string[];
  /** Signals that could not be counted, and why. */
  missingData: { signal: SignalName; state: "absent" | "unknown" }[];
  rulesetVersion: string;
  calculatedAt: string;
}

export type QualificationState = "QUALIFIED" | "NEEDS_INFO" | "NURTURE" | "DISQUALIFIED" | "UNKNOWN";

export interface QualificationResult {
  state: QualificationState;
  reasonCodes: string[];
  /** Which stored signals the decision leaned on, for audit. */
  evidenceRefs: { signal: SignalName; extractionVersion: string }[];
  rulesetVersion: string;
  calculatedAt: string;
}

export interface RuleInput {
  signals: readonly StoredSignal[];
  facts: LeadFacts;
  /** Injected so tests are not clock-dependent. */
  now?: Date;
}
