import { computeQualification } from "@/lib/lead-rules/qualification";
import { computeReadiness } from "@/lib/lead-rules/readiness";
import { RULESET_VERSION } from "@/lib/lead-rules/types";
import { signalPresence } from "@/lib/lead-signals/contract";
import type { SignalName, StoredSignal } from "@/lib/lead-signals/types";
import type {
  ContactReason,
  ExcludedLead,
  QueueInput,
  QueueResult,
  ReviewItem,
  SalesReadyLead,
  SuggestedAction,
} from "./types";

/** Ordering weight per band. Higher sorts first. */
const BAND_RANK = { hot: 3, warm: 2, cold: 1 } as const;

function present(signals: readonly StoredSignal[], name: SignalName): StoredSignal | undefined {
  const signal = signals.find((candidate) => candidate.name === name);
  return signal && signalPresence(signal) === "present" ? signal : undefined;
}

/**
 * Why this lead deserves a call now.
 *
 * Ordered most specific first, so the strongest true statement wins. The caller
 * gets a code; the wording lives in the UI.
 */
function contactReason(input: QueueInput): ContactReason {
  const intent = present(input.signals, "seller_intent");
  const timeframe = present(input.signals, "timeframe");

  if (intent?.confidence === "high" && timeframe) return "intent_with_timeframe";
  if (intent?.confidence === "high" && input.facts.ageInDays <= 2) return "fresh_intent";
  if (input.firstContactAttempt.state === "none") return "never_contacted";
  if (input.firstContactAttempt.state === "known" && input.facts.ageInDays > 7) return "ageing_after_contact";
  return "qualified";
}

function suggestedAction(input: QueueInput): SuggestedAction {
  // A phone number is the only thing that makes "call" actionable; the CRM
  // fact says a contact path exists, not which one, so the channel choice
  // stays a UI concern beyond this default.
  return input.facts.hasContactPath ? "call" : "review_data";
}

/**
 * Pick the review reason from the qualification outcome.
 *
 * Duplicate uncertainty outranks everything: merging two people is worse than
 * calling one of them late, so it must be resolved before anything else.
 */
function reviewReason(
  input: QueueInput,
  state: ReturnType<typeof computeQualification>,
): ReviewItem["reason"] | null {
  if (input.duplicateUncertain) return "duplicate_uncertain";
  if (state.state === "UNKNOWN") return "nothing_extracted";
  if (state.state === "NEEDS_INFO") {
    return state.reasonCodes.includes("seller_intent_unverifiable")
      ? "unverifiable_extraction"
      : "insufficient_evidence";
  }
  return null;
}

/**
 * Build both queues from rule output.
 *
 * No model, no I/O, no clock unless injected. Given the same inputs the same
 * order comes out, which is what makes a morning list something a broker can
 * learn to trust.
 *
 * Every input lead lands in exactly one of `salesReady`, `review` or
 * `excluded` — the totals reconcile by construction, and that is pinned by
 * test. A lead that vanishes between the rules and the screen is the failure
 * nobody notices until someone asks where their enquiry went.
 */
export function assembleQueues(inputs: readonly QueueInput[], now: Date = new Date()): QueueResult {
  const assembledAt = now.toISOString();
  const salesReadyDraft: Omit<SalesReadyLead, "rank">[] = [];
  const review: ReviewItem[] = [];
  const excluded: ExcludedLead[] = [];

  for (const input of inputs) {
    const ruleInput = { signals: input.signals, facts: input.facts, now };
    const qualification = computeQualification(ruleInput);
    const readiness = computeReadiness(ruleInput);

    // An uncertain duplicate never reaches the morning list, however good it
    // looks: acting on it risks contacting the same person twice under two
    // records, which reads to them as a disorganised agency.
    const needsReview = reviewReason(input, qualification);
    if (needsReview) {
      review.push({
        leadId: input.leadId,
        reason: needsReview,
        qualificationState: qualification.state,
        reasonCodes: qualification.reasonCodes,
        assignedAgentId: input.assignedAgentId,
      });
      continue;
    }

    if (qualification.state === "DISQUALIFIED") {
      // Disqualification is only ever reached on evidence (rules §20), so it
      // does not need a human to confirm it — but it is recorded rather than
      // dropped.
      excluded.push({ leadId: input.leadId, reason: "disqualified_on_evidence" });
      continue;
    }

    if (qualification.state === "NURTURE") {
      excluded.push({ leadId: input.leadId, reason: "nurture" });
      continue;
    }

    salesReadyDraft.push({
      leadId: input.leadId,
      readinessScore: readiness.score,
      readinessBand: readiness.band,
      qualificationState: qualification.state,
      reasonCodes: qualification.reasonCodes,
      reasonToContactNow: contactReason(input),
      suggestedAction: suggestedAction(input),
      ageSinceCaptureDays: input.facts.ageInDays,
      assignedAgentId: input.assignedAgentId,
      contactState: input.firstContactAttempt.state,
    });
  }

  salesReadyDraft.sort((a, b) => {
    // 1. band, 2. score, 3. never-contacted before already-contacted,
    // 4. older first, 5. lead id so the order is total and reproducible.
    const byBand = BAND_RANK[b.readinessBand] - BAND_RANK[a.readinessBand];
    if (byBand !== 0) return byBand;

    const byScore = b.readinessScore - a.readinessScore;
    if (byScore !== 0) return byScore;

    const contactWeight = (state: SalesReadyLead["contactState"]) => (state === "none" ? 0 : 1);
    const byContact = contactWeight(a.contactState) - contactWeight(b.contactState);
    if (byContact !== 0) return byContact;

    const byAge = b.ageSinceCaptureDays - a.ageSinceCaptureDays;
    if (byAge !== 0) return byAge;

    return a.leadId.localeCompare(b.leadId);
  });

  return {
    salesReady: salesReadyDraft.map((lead, index) => ({ ...lead, rank: index + 1 })),
    review,
    excluded,
    rulesetVersion: RULESET_VERSION,
    assembledAt,
  };
}
