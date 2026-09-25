import { describe, expect, it } from "vitest";
import { assembleQueues } from "@/lib/lead-queues/assemble";
import type { QueueInput } from "@/lib/lead-queues/types";
import { RULESET_VERSION, type LeadFacts } from "@/lib/lead-rules/types";
import type { SignalName, StoredSignal } from "@/lib/lead-signals/types";

const NOW = new Date("2026-09-25T08:00:00.000Z");

function signal(name: SignalName, overrides: Partial<StoredSignal> = {}): StoredSignal {
  return {
    leadId: "lead-x",
    agencyId: "agency-a",
    name,
    value: `${name}-value`,
    confidence: "high",
    evidenceSpan: `quote for ${name}`,
    sourceField: "message",
    extractionVersion: "seller-signal-extractor-v1",
    extractedAt: "2026-09-25T07:00:00.000Z",
    ...overrides,
  };
}

function facts(overrides: Partial<LeadFacts> = {}): LeadFacts {
  return { hasContactPath: true, optedOut: false, ageInDays: 0, ...overrides };
}

function entry(leadId: string, overrides: Partial<QueueInput> = {}): QueueInput {
  return {
    leadId,
    agencyId: "agency-a",
    assignedAgentId: "agent-1",
    signals: [signal("seller_intent"), signal("locality")],
    facts: facts(),
    firstContactAttempt: { state: "none" },
    ...overrides,
  };
}

describe("assembleQueues — nothing vanishes", () => {
  it("every lead lands in exactly one bucket", () => {
    const inputs = [
      entry("qualified"),
      entry("nurture", { signals: [signal("seller_intent", { value: null, evidenceSpan: null })] }),
      entry("needs-info", { signals: [signal("seller_intent", { evidenceSpan: null })] }),
      entry("unknown", { signals: [] }),
      entry("disqualified", { facts: facts({ optedOut: true }) }),
      entry("dupe", { duplicateUncertain: true }),
    ];

    const result = assembleQueues(inputs, NOW);
    const seen = [
      ...result.salesReady.map((lead) => lead.leadId),
      ...result.review.map((item) => item.leadId),
      ...result.excluded.map((item) => item.leadId),
    ];

    expect(seen.sort()).toEqual(inputs.map((input) => input.leadId).sort());
    expect(seen.length).toBe(new Set(seen).size);
    expect(seen.length).toBe(inputs.length);
  });

  it("routes each state to the right bucket", () => {
    const result = assembleQueues(
      [
        entry("qualified"),
        entry("nurture", { signals: [signal("seller_intent", { value: null, evidenceSpan: null })] }),
        entry("unverifiable", { signals: [signal("seller_intent", { evidenceSpan: null })] }),
        entry("nothing", { signals: [] }),
        entry("optout", { facts: facts({ optedOut: true }) }),
      ],
      NOW,
    );

    expect(result.salesReady.map((l) => l.leadId)).toEqual(["qualified"]);
    expect(result.review).toEqual([
      expect.objectContaining({ leadId: "unverifiable", reason: "unverifiable_extraction" }),
      expect.objectContaining({ leadId: "nothing", reason: "nothing_extracted" }),
    ]);
    expect(result.excluded).toEqual([
      { leadId: "nurture", reason: "nurture" },
      { leadId: "optout", reason: "disqualified_on_evidence" },
    ]);
  });

  it("an uncertain duplicate never reaches the morning list, however good it looks", () => {
    // Contacting the same person twice under two records reads to them as a
    // disorganised agency — worse than calling them a day late.
    const perfect = entry("dupe", {
      duplicateUncertain: true,
      signals: [signal("seller_intent"), signal("locality"), signal("timeframe"), signal("property_type")],
    });
    const result = assembleQueues([perfect], NOW);

    expect(result.salesReady).toHaveLength(0);
    expect(result.review[0]).toMatchObject({ leadId: "dupe", reason: "duplicate_uncertain" });
  });
});

describe("assembleQueues — ordering is total and reproducible", () => {
  it("ranks by band, then score, then never-contacted, then age", () => {
    const inputs = [
      entry("cold", { signals: [signal("locality", { confidence: "low" }), signal("seller_intent", { confidence: "low" })], facts: facts({ ageInDays: 30 }) }),
      entry("hot", { signals: [signal("seller_intent"), signal("locality"), signal("timeframe"), signal("property_type")] }),
      entry("warm", { signals: [signal("seller_intent"), signal("locality")] }),
    ];

    const result = assembleQueues(inputs, NOW);
    expect(result.salesReady.map((l) => l.leadId)).toEqual(["hot", "warm", "cold"]);
    expect(result.salesReady.map((l) => l.rank)).toEqual([1, 2, 3]);
  });

  it("puts a never-contacted lead above an identical one already contacted", () => {
    const inputs = [
      entry("contacted", { firstContactAttempt: { state: "known", occurredAt: "2026-09-24T10:00:00.000Z" } }),
      entry("untouched", { firstContactAttempt: { state: "none" } }),
    ];
    const result = assembleQueues(inputs, NOW);
    expect(result.salesReady.map((l) => l.leadId)).toEqual(["untouched", "contacted"]);
  });

  it("treats an unknown contact state as contacted, not as never contacted", () => {
    // We do not know, so we must not claim the lead was neglected. Ranking it
    // as untouched would invent the very fact the substrate refuses to invent.
    const inputs = [
      entry("unknown-contact", { firstContactAttempt: { state: "unknown", attempts: 2 } }),
      entry("untouched", { firstContactAttempt: { state: "none" } }),
    ];
    const result = assembleQueues(inputs, NOW);
    expect(result.salesReady.map((l) => l.leadId)).toEqual(["untouched", "unknown-contact"]);
  });

  it("is stable — input order does not change output order", () => {
    const inputs = [entry("a"), entry("b"), entry("c")];
    const forward = assembleQueues(inputs, NOW);
    const reversed = assembleQueues([...inputs].reverse(), NOW);
    expect(forward).toEqual(reversed);
  });
});

describe("assembleQueues — reason to contact now", () => {
  it("intent plus a timeframe is the strongest case", () => {
    const result = assembleQueues(
      [entry("x", { signals: [signal("seller_intent"), signal("locality"), signal("timeframe")] })],
      NOW,
    );
    expect(result.salesReady[0]?.reasonToContactNow).toBe("intent_with_timeframe");
  });

  it("falls back through fresh intent, never contacted, ageing, qualified", () => {
    const fresh = assembleQueues([entry("f", { facts: facts({ ageInDays: 1 }) })], NOW);
    expect(fresh.salesReady[0]?.reasonToContactNow).toBe("fresh_intent");

    const untouched = assembleQueues(
      [entry("n", { signals: [signal("seller_intent", { confidence: "medium" }), signal("locality")], facts: facts({ ageInDays: 5 }) })],
      NOW,
    );
    expect(untouched.salesReady[0]?.reasonToContactNow).toBe("never_contacted");

    const ageing = assembleQueues(
      [
        entry("a", {
          signals: [signal("seller_intent", { confidence: "medium" }), signal("locality")],
          facts: facts({ ageInDays: 20 }),
          firstContactAttempt: { state: "known", occurredAt: "2026-09-10T10:00:00.000Z" },
        }),
      ],
      NOW,
    );
    expect(ageing.salesReady[0]?.reasonToContactNow).toBe("ageing_after_contact");
  });

  it("never emits user-facing prose or an SLA claim", () => {
    const result = assembleQueues([entry("x")], NOW);
    const serialised = JSON.stringify(result);
    expect(serialised).not.toMatch(/minút|hodín|SLA|within/i);
    // The queue carries age purely as an ordering input.
    expect(result.salesReady[0]).toHaveProperty("ageSinceCaptureDays");
  });

  it("stamps the ruleset version it was assembled under", () => {
    const result = assembleQueues([entry("x")], NOW);
    expect(result.rulesetVersion).toBe(RULESET_VERSION);
    expect(result.assembledAt).toBe(NOW.toISOString());
  });

  it("suggests reviewing the data when there is no way to reach the lead", () => {
    // No contact path makes qualification NEEDS_INFO, so it is a review item —
    // the suggested action never tells a broker to call a number we lack.
    const result = assembleQueues([entry("x", { facts: facts({ hasContactPath: false }) })], NOW);
    expect(result.salesReady).toHaveLength(0);
    expect(result.review[0]).toMatchObject({ reason: "insufficient_evidence" });
  });

  it("an empty input gives empty queues, not an error", () => {
    const result = assembleQueues([], NOW);
    expect(result).toMatchObject({ salesReady: [], review: [], excluded: [] });
  });
});
