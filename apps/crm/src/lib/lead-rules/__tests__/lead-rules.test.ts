import { describe, expect, it } from "vitest";
import { computeReadiness } from "@/lib/lead-rules/readiness";
import { computeQualification } from "@/lib/lead-rules/qualification";
import { RULESET_VERSION, type LeadFacts } from "@/lib/lead-rules/types";
import type { Confidence, SignalName, StoredSignal } from "@/lib/lead-signals/types";

const NOW = new Date("2026-09-24T12:00:00.000Z");

function stored(
  name: SignalName,
  overrides: Partial<StoredSignal> = {},
): StoredSignal {
  return {
    leadId: "lead-1",
    agencyId: "agency-a",
    name,
    value: `${name}-value`,
    confidence: "high" as Confidence,
    evidenceSpan: `quote for ${name}`,
    sourceField: "message",
    extractionVersion: "seller-signal-extractor-v1",
    extractedAt: "2026-09-24T11:00:00.000Z",
    ...overrides,
  };
}

function facts(overrides: Partial<LeadFacts> = {}): LeadFacts {
  return { hasContactPath: true, optedOut: false, ageInDays: 0, ...overrides };
}

const ALL_SIGNALS = [
  stored("seller_intent"),
  stored("timeframe"),
  stored("locality"),
  stored("property_type"),
];

describe("computeReadiness — determinism is the contract", () => {
  it("same signals and same ruleset give the same result, whatever the input order", () => {
    const forward = computeReadiness({ signals: ALL_SIGNALS, facts: facts(), now: NOW });
    const reversed = computeReadiness({ signals: [...ALL_SIGNALS].reverse(), facts: facts(), now: NOW });
    expect(forward).toEqual(reversed);
  });

  it("scores a complete high-confidence lead at the ceiling", () => {
    const result = computeReadiness({ signals: ALL_SIGNALS, facts: facts(), now: NOW });
    expect(result.score).toBe(100);
    expect(result.band).toBe("hot");
    expect(result.rulesetVersion).toBe(RULESET_VERSION);
    expect(result.missingData).toEqual([]);
  });

  it("confidence scales a contribution instead of gating it", () => {
    const high = computeReadiness({ signals: [stored("seller_intent")], facts: facts({ hasContactPath: false }), now: NOW });
    const medium = computeReadiness({
      signals: [stored("seller_intent", { confidence: "medium" })],
      facts: facts({ hasContactPath: false }),
      now: NOW,
    });
    const low = computeReadiness({
      signals: [stored("seller_intent", { confidence: "low" })],
      facts: facts({ hasContactPath: false }),
      now: NOW,
    });

    expect(high.score).toBe(40);
    expect(medium.score).toBe(30);
    expect(low.score).toBe(20);
    // A low-confidence finding still beats no finding at all.
    expect(low.score).toBeGreaterThan(0);
  });

  it("an unverifiable signal scores zero but is reported differently from an absent one", () => {
    const unverifiable = computeReadiness({
      signals: [stored("seller_intent", { evidenceSpan: null })],
      facts: facts(),
      now: NOW,
    });
    const notExtracted = computeReadiness({ signals: [], facts: facts(), now: NOW });

    expect(unverifiable.score).toBe(notExtracted.score);
    expect(unverifiable.reasonCodes).toContain("seller_intent_unverifiable");
    expect(notExtracted.reasonCodes).toContain("seller_intent_not_extracted");
    expect(unverifiable.missingData).toContainEqual({ signal: "seller_intent", state: "unknown" });
  });

  it("missing contact path costs its weight and says so", () => {
    const withPath = computeReadiness({ signals: ALL_SIGNALS, facts: facts(), now: NOW });
    const without = computeReadiness({ signals: ALL_SIGNALS, facts: facts({ hasContactPath: false }), now: NOW });
    expect(withPath.score - without.score).toBe(10);
    expect(without.reasonCodes).toContain("no_contact_path");
  });

  it("staleness is capped so age never dominates the score", () => {
    const fresh = computeReadiness({ signals: ALL_SIGNALS, facts: facts(), now: NOW });
    const old = computeReadiness({ signals: ALL_SIGNALS, facts: facts({ ageInDays: 365 }), now: NOW });
    expect(fresh.score - old.score).toBe(15);
    expect(old.reasonCodes.some((code) => code.startsWith("stale_"))).toBe(true);
  });

  it("never returns a score outside 0..100", () => {
    const empty = computeReadiness({ signals: [], facts: facts({ hasContactPath: false, ageInDays: 999 }), now: NOW });
    expect(empty.score).toBe(0);
    expect(empty.band).toBe("cold");
  });
});

describe("computeQualification — DISQUALIFIED only on evidence", () => {
  it("qualifies a lead with intent, a contact path and context", () => {
    const result = computeQualification({ signals: ALL_SIGNALS, facts: facts(), now: NOW });
    expect(result.state).toBe("QUALIFIED");
    expect(result.reasonCodes).toContain("seller_intent_present");
    expect(result.evidenceRefs.map((ref) => ref.signal)).toEqual([
      "locality",
      "property_type",
      "seller_intent",
      "timeframe",
    ]);
  });

  it("a thin lead is NURTURE, never DISQUALIFIED", () => {
    // The single most expensive mistake this gate can make is throwing away a
    // real seller because our reading of them was poor.
    const result = computeQualification({
      signals: [stored("seller_intent", { value: null, evidenceSpan: null })],
      facts: facts(),
      now: NOW,
    });
    expect(result.state).toBe("NURTURE");
    expect(result.state).not.toBe("DISQUALIFIED");
  });

  it("an unverifiable intent is NEEDS_INFO — the lead is not punished for our extraction", () => {
    const result = computeQualification({
      signals: [stored("seller_intent", { evidenceSpan: null })],
      facts: facts(),
      now: NOW,
    });
    expect(result.state).toBe("NEEDS_INFO");
    expect(result.reasonCodes).toEqual(["seller_intent_unverifiable"]);
  });

  it("nothing extracted at all is UNKNOWN, not absent", () => {
    const result = computeQualification({ signals: [], facts: facts(), now: NOW });
    expect(result.state).toBe("UNKNOWN");
  });

  it("no contact path is NEEDS_INFO — a gap in our record, not a verdict", () => {
    const result = computeQualification({
      signals: ALL_SIGNALS,
      facts: facts({ hasContactPath: false }),
      now: NOW,
    });
    expect(result.state).toBe("NEEDS_INFO");
    expect(result.reasonCodes).toEqual(["no_contact_path"]);
  });

  it("intent without any context is NEEDS_INFO", () => {
    const result = computeQualification({ signals: [stored("seller_intent")], facts: facts(), now: NOW });
    expect(result.state).toBe("NEEDS_INFO");
    expect(result.reasonCodes).toEqual(["no_property_or_locality_context"]);
  });

  it("either locality or property type satisfies context", () => {
    const withLocality = computeQualification({
      signals: [stored("seller_intent"), stored("locality")],
      facts: facts(),
      now: NOW,
    });
    const withType = computeQualification({
      signals: [stored("seller_intent"), stored("property_type")],
      facts: facts(),
      now: NOW,
    });
    expect(withLocality.state).toBe("QUALIFIED");
    expect(withType.state).toBe("QUALIFIED");
  });

  it("opt-out and hard disqualifiers are the only routes to DISQUALIFIED", () => {
    const optedOut = computeQualification({ signals: ALL_SIGNALS, facts: facts({ optedOut: true }), now: NOW });
    const sold = computeQualification({
      signals: ALL_SIGNALS,
      facts: facts({ hardDisqualifier: "already_sold" }),
      now: NOW,
    });
    expect(optedOut.state).toBe("DISQUALIFIED");
    expect(optedOut.reasonCodes).toEqual(["opted_out"]);
    expect(sold.reasonCodes).toEqual(["already_sold"]);
  });

  it("a cold score alone never disqualifies", () => {
    const signals = [stored("seller_intent", { confidence: "low" }), stored("locality", { confidence: "low" })];
    const readiness = computeReadiness({ signals, facts: facts({ ageInDays: 60 }), now: NOW });
    const qualification = computeQualification({ signals, facts: facts({ ageInDays: 60 }), now: NOW });

    expect(readiness.band).toBe("cold");
    expect(qualification.state).toBe("QUALIFIED");
  });

  it("is deterministic across input order", () => {
    const forward = computeQualification({ signals: ALL_SIGNALS, facts: facts(), now: NOW });
    const reversed = computeQualification({ signals: [...ALL_SIGNALS].reverse(), facts: facts(), now: NOW });
    expect(forward).toEqual(reversed);
  });

  it("carries the extraction version of every signal it leaned on", () => {
    const result = computeQualification({ signals: ALL_SIGNALS, facts: facts(), now: NOW });
    for (const ref of result.evidenceRefs) {
      expect(ref.extractionVersion).toBe("seller-signal-extractor-v1");
    }
  });
});
