import { signalPresence } from "@/lib/lead-signals/contract";
import { SIGNAL_NAMES, type Confidence, type SignalName, type StoredSignal } from "@/lib/lead-signals/types";
import { RULESET_VERSION, type ReadinessBand, type ReadinessResult, type RuleInput } from "./types";

/**
 * Weights are config, not a prompt (engine contract §18).
 *
 * They add to 90 across the four signals, leaving 10 for contactability — a
 * fact the CRM owns rather than one a model reads. Intent dominates on purpose:
 * a lead that says it wants to sell but names no district is worth more to a
 * broker than one that names a district and never says why it wrote in.
 */
const WEIGHTS: Record<SignalName, number> = {
  seller_intent: 40,
  timeframe: 20,
  locality: 15,
  property_type: 15,
};

const CONTACT_PATH_WEIGHT = 10;

/**
 * Confidence scales a signal's contribution rather than gating it.
 *
 * A low-confidence finding is still a finding — it just should not carry the
 * same weight as one the extractor was sure about. Gating instead would throw
 * away the difference between "probably" and "nothing".
 */
const CONFIDENCE_FACTOR: Record<Confidence, number> = {
  high: 1,
  medium: 0.75,
  low: 0.5,
};

const HOT_THRESHOLD = 70;
const WARM_THRESHOLD = 40;

/** Stale leads lose a little; the penalty is capped so age never dominates. */
const STALENESS_PENALTY_PER_WEEK = 5;
const MAX_STALENESS_PENALTY = 15;

function band(score: number): ReadinessBand {
  if (score >= HOT_THRESHOLD) return "hot";
  if (score >= WARM_THRESHOLD) return "warm";
  return "cold";
}

/**
 * Compute readiness from stored signals and CRM facts.
 *
 * Pure: no clock unless injected, no I/O, no model. Given the same signals and
 * the same `RULESET_VERSION`, the result is identical — that invariant is what
 * lets a score be stored and trusted later, and it is pinned by test.
 *
 * A signal only scores when `signalPresence` says `present`. Evidence was
 * already verified when it was stored, so this does not re-read the source
 * text: an `unknown` here means the row itself is unusable, not that the quote
 * failed a second check.
 */
export function computeReadiness(input: RuleInput): ReadinessResult {
  const calculatedAt = (input.now ?? new Date()).toISOString();
  const byName = new Map<SignalName, StoredSignal>();
  for (const signal of input.signals) {
    // First write wins, matching the extraction contract's duplicate rule.
    if (!byName.has(signal.name)) byName.set(signal.name, signal);
  }

  let score = 0;
  const reasonCodes: string[] = [];
  const missingData: ReadinessResult["missingData"] = [];

  // Iterate the canonical order, not the input order, so two callers holding
  // the same signals in different orders get identical reason codes.
  for (const name of SIGNAL_NAMES) {
    const signal = byName.get(name);
    if (!signal) {
      missingData.push({ signal: name, state: "absent" });
      reasonCodes.push(`${name}_not_extracted`);
      continue;
    }

    const presence = signalPresence(signal);
    if (presence !== "present") {
      missingData.push({ signal: name, state: presence });
      // `unknown` and `absent` score the same — zero — but they are reported
      // differently, because one means "we could not tell" and the other means
      // "we looked and there was nothing". Collapsing them loses the
      // difference between a gap in the data and a fact about the lead.
      reasonCodes.push(presence === "unknown" ? `${name}_unverifiable` : `${name}_absent`);
      continue;
    }

    const contribution = WEIGHTS[name] * CONFIDENCE_FACTOR[signal.confidence];
    score += contribution;
    reasonCodes.push(signal.confidence === "high" ? `${name}_present` : `${name}_present_${signal.confidence}`);
  }

  if (input.facts.hasContactPath) {
    score += CONTACT_PATH_WEIGHT;
    reasonCodes.push("contact_path_present");
  } else {
    reasonCodes.push("no_contact_path");
  }

  if (input.facts.ageInDays > 7) {
    const weeks = Math.floor(input.facts.ageInDays / 7);
    const penalty = Math.min(weeks * STALENESS_PENALTY_PER_WEEK, MAX_STALENESS_PENALTY);
    score -= penalty;
    reasonCodes.push(`stale_${weeks}w`);
  }

  const bounded = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score: bounded,
    band: band(bounded),
    reasonCodes,
    missingData,
    rulesetVersion: RULESET_VERSION,
    calculatedAt,
  };
}
