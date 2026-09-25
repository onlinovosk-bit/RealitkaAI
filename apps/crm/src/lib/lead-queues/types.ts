import type { FirstContactAttempt } from "@/lib/lead-contact-events/types";
import type { LeadFacts, QualificationResult, ReadinessResult } from "@/lib/lead-rules/types";
import type { StoredSignal } from "@/lib/lead-signals/types";

/**
 * The two queues (engine contract §22).
 *
 * Queue A is what a broker opens in the morning: people to act on now. Queue B
 * is what somebody checks when the system is unsure. They are kept apart
 * because a review item at the top of the morning list is worse than no list —
 * the broker learns the queue wastes their time and stops opening it.
 *
 * Assembly is deterministic and calls no model. It only arranges what the
 * rules already decided.
 */

export interface QueueInput {
  leadId: string;
  agencyId: string;
  assignedAgentId: string | null;
  signals: readonly StoredSignal[];
  facts: LeadFacts;
  /** From `getFirstContactAttemptAt`. `unknown` is not the same as `none`. */
  firstContactAttempt: FirstContactAttempt;
  /** True when dedup could not decide on its own. */
  duplicateUncertain?: boolean;
}

/**
 * Why this lead, now — as a code, not a sentence.
 *
 * The engine does not write user-facing prose: §9 of the contract puts that in
 * the UI layer, where it can be phrased in the broker's language without a
 * rule change. A code also survives translation and can be counted.
 */
export const CONTACT_REASONS = [
  /** High-confidence intent and a stated timeframe — the strongest case. */
  "intent_with_timeframe",
  /** Fresh, high-confidence intent, no timeframe yet. */
  "fresh_intent",
  /** Qualified and nobody has tried to reach them yet. */
  "never_contacted",
  /** Qualified, contacted before, and going cold. */
  "ageing_after_contact",
  /** Qualified but nothing above applies. */
  "qualified",
] as const;
export type ContactReason = (typeof CONTACT_REASONS)[number];

export const SUGGESTED_ACTIONS = ["call", "email", "review_data"] as const;
export type SuggestedAction = (typeof SUGGESTED_ACTIONS)[number];

export interface SalesReadyLead {
  leadId: string;
  rank: number;
  readinessScore: number;
  readinessBand: ReadinessResult["band"];
  qualificationState: QualificationResult["state"];
  reasonCodes: string[];
  reasonToContactNow: ContactReason;
  suggestedAction: SuggestedAction;
  /** Days since capture. Ordering input only — never rendered as an SLA (§8). */
  ageSinceCaptureDays: number;
  assignedAgentId: string | null;
  /** Whether anyone has already tried: none / unknown / known. */
  contactState: FirstContactAttempt["state"];
}

export const REVIEW_REASONS = [
  "duplicate_uncertain",
  "proposed_disqualification",
  "insufficient_evidence",
  "unverifiable_extraction",
  "nothing_extracted",
] as const;
export type ReviewReason = (typeof REVIEW_REASONS)[number];

export interface ReviewItem {
  leadId: string;
  reason: ReviewReason;
  qualificationState: QualificationResult["state"];
  reasonCodes: string[];
  assignedAgentId: string | null;
}

/**
 * Leads in neither queue, with the reason they are not.
 *
 * Exists so the totals reconcile. A lead that silently disappears between the
 * rules and the screen is the failure nobody notices until a broker asks where
 * their enquiry went.
 */
export interface ExcludedLead {
  leadId: string;
  reason: "nurture" | "disqualified_on_evidence";
}

export interface QueueResult {
  salesReady: SalesReadyLead[];
  review: ReviewItem[];
  excluded: ExcludedLead[];
  rulesetVersion: string;
  assembledAt: string;
}
