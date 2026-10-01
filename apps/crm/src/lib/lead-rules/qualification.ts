import { signalPresence } from "@/lib/lead-signals/contract";
import type { SignalName, StoredSignal } from "@/lib/lead-signals/types";
import { RULESET_VERSION, type QualificationResult, type RuleInput } from "./types";

/**
 * The qualification gate (engine contract §20).
 *
 * Pure rules over stored evidence. No model, no score threshold: readiness and
 * qualification answer different questions, and letting a number decide would
 * quietly turn "we know little about this lead" into "this lead is worthless".
 */

/** Context is satisfied by either — a broker can work a district without a type, or vice versa. */
const CONTEXT_SIGNALS: SignalName[] = ["locality", "property_type"];

function present(signals: Map<SignalName, StoredSignal>, name: SignalName): boolean {
  const signal = signals.get(name);
  return signal !== undefined && signalPresence(signal) === "present";
}

/**
 * Decide whether there is enough evidence for a broker to act.
 *
 * The order of the checks is the decision:
 *
 *   1. a hard disqualifier, on evidence only
 *   2. no contact path — nothing can be done, however good the lead looks
 *   3. no credible seller intent — not a seller yet
 *   4. no context — a seller with nowhere to sell
 *   5. everything present
 *
 * `DISQUALIFIED` is reachable only from step 1. A low score, thin evidence or
 * an unverifiable extraction never disqualify: those are `NURTURE` or
 * `NEEDS_INFO`, because the lead may be fine and our reading of it is what is
 * poor. Throwing away a real seller is far more expensive than a wasted call.
 */
export function computeQualification(input: RuleInput): QualificationResult {
  const calculatedAt = (input.now ?? new Date()).toISOString();
  const byName = new Map<SignalName, StoredSignal>();
  for (const signal of input.signals) {
    if (!byName.has(signal.name)) byName.set(signal.name, signal);
  }

  const evidenceRefs: QualificationResult["evidenceRefs"] = [];
  for (const [name, signal] of byName) {
    if (signalPresence(signal) === "present") {
      evidenceRefs.push({ signal: name, extractionVersion: signal.extractionVersion });
    }
  }
  evidenceRefs.sort((a, b) => a.signal.localeCompare(b.signal));

  const base = { evidenceRefs, rulesetVersion: RULESET_VERSION, calculatedAt };

  if (input.facts.optedOut) {
    return { ...base, state: "DISQUALIFIED", reasonCodes: ["opted_out"] };
  }
  if (input.facts.hardDisqualifier) {
    return { ...base, state: "DISQUALIFIED", reasonCodes: [input.facts.hardDisqualifier] };
  }

  if (!input.facts.hasContactPath) {
    // Not a disqualification: the person may well want to sell, we simply have
    // no way to reach them. That is a gap in our record, not a verdict on them.
    return { ...base, state: "NEEDS_INFO", reasonCodes: ["no_contact_path"] };
  }

  const intent = byName.get("seller_intent");
  if (!intent) {
    return { ...base, state: "UNKNOWN", reasonCodes: ["seller_intent_not_extracted"] };
  }
  const intentPresence = signalPresence(intent);
  if (intentPresence === "unknown") {
    // The extractor claimed intent it could not evidence. Refusing to act on
    // that is the whole point of the evidence rule; refusing to nurture the
    // lead because of it would punish the lead for our extraction.
    return { ...base, state: "NEEDS_INFO", reasonCodes: ["seller_intent_unverifiable"] };
  }
  if (intentPresence === "absent") {
    return { ...base, state: "NURTURE", reasonCodes: ["no_seller_intent"] };
  }

  const hasContext = CONTEXT_SIGNALS.some((name) => present(byName, name));
  if (!hasContext) {
    return { ...base, state: "NEEDS_INFO", reasonCodes: ["no_property_or_locality_context"] };
  }

  const reasonCodes = ["seller_intent_present", "contact_path_present"];
  for (const name of CONTEXT_SIGNALS) {
    if (present(byName, name)) reasonCodes.push(`${name}_present`);
  }
  if (present(byName, "timeframe")) reasonCodes.push("timeframe_present");

  return { ...base, state: "QUALIFIED", reasonCodes };
}
