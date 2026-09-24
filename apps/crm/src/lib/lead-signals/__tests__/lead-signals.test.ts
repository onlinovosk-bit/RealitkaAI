import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseExtraction,
  parseSignal,
  signalPresence,
  verifyEvidence,
} from "@/lib/lead-signals/contract";
import { persistSignals, readSignals } from "@/lib/lead-signals/store";
import { SignalContractError, type ExtractedSignal } from "@/lib/lead-signals/types";

const MESSAGE = "Dobrý deň, chcem predať 3-izbový byt v Prešove, ideálne do dvoch mesiacov.";

function signal(overrides: Partial<ExtractedSignal> = {}): ExtractedSignal {
  return {
    name: "seller_intent",
    value: "predaj",
    confidence: "high",
    evidenceSpan: "chcem predať",
    sourceField: "message",
    ...overrides,
  };
}

describe("signalPresence — the rule this wall exists for", () => {
  it("a value with verifiable evidence is PRESENT", () => {
    expect(signalPresence(signal(), MESSAGE)).toBe("present");
  });

  it("a value WITHOUT an evidence span is UNKNOWN, never present", () => {
    expect(signalPresence(signal({ evidenceSpan: null }))).toBe("unknown");
    expect(signalPresence(signal({ evidenceSpan: "   " }))).toBe("unknown");
  });

  it("a value whose evidence is not in the source text is UNKNOWN", () => {
    // The model asserting a quote is not the same as the quote existing. This
    // is the anti-fabrication check: invented proof reads exactly like proof.
    expect(signalPresence(signal({ evidenceSpan: "chcem kúpiť" }), MESSAGE)).toBe("unknown");
  });

  it("no value and no evidence is ABSENT — a real finding, not a gap", () => {
    expect(signalPresence(signal({ value: null, evidenceSpan: null }))).toBe("absent");
  });

  it("absent and unknown are distinct", () => {
    const absent = signalPresence(signal({ value: null, evidenceSpan: null }));
    const unknown = signalPresence(signal({ evidenceSpan: null }));
    expect(absent).toBe("absent");
    expect(unknown).toBe("unknown");
    expect(absent).not.toBe(unknown);
  });
});

describe("verifyEvidence", () => {
  it("tolerates reformatting but not rewording", () => {
    expect(verifyEvidence("chcem   predať", MESSAGE)).toBe(true);
    expect(verifyEvidence("CHCEM PREDAŤ", MESSAGE)).toBe(true);
    expect(verifyEvidence("chcem rýchlo predať", MESSAGE)).toBe(false);
  });

  it("an empty span never verifies", () => {
    expect(verifyEvidence("", MESSAGE)).toBe(false);
    expect(verifyEvidence("   ", MESSAGE)).toBe(false);
  });
});

describe("parseSignal", () => {
  it("accepts a well-formed signal", () => {
    const parsed = parseSignal({
      name: "timeframe",
      value: "do dvoch mesiacov",
      confidence: "medium",
      evidence_span: "do dvoch mesiacov",
      source_field: "message",
    });
    expect(parsed).toMatchObject({ name: "timeframe", confidence: "medium" });
  });

  it("refuses a value with no evidence_span", () => {
    expect(() =>
      parseSignal({ name: "locality", value: "Prešov", confidence: "high", source_field: "message" }),
    ).toThrow(/not a finding/);
  });

  it("refuses an unknown signal name rather than widening the schema", () => {
    expect(() =>
      parseSignal({ name: "budget", value: "200000", confidence: "high", evidence_span: "x", source_field: "message" }),
    ).toThrow(SignalContractError);
  });

  it("refuses an unknown confidence level", () => {
    expect(() =>
      parseSignal({ name: "locality", value: "Prešov", confidence: "pretty sure", evidence_span: "v Prešove", source_field: "message" }),
    ).toThrow(/confidence must be one of/);
  });

  it("refuses a signal that does not say where it came from", () => {
    expect(() =>
      parseSignal({ name: "locality", value: "Prešov", confidence: "high", evidence_span: "v Prešove" }),
    ).toThrow(/source_field is required/);
  });

  it("a null value with no evidence is legal — the extractor looked and found nothing", () => {
    const parsed = parseSignal({
      name: "property_type",
      value: null,
      confidence: "low",
      evidence_span: null,
      source_field: "message",
    });
    expect(parsed.value).toBeNull();
  });
});

describe("parseExtraction", () => {
  const sources = { message: MESSAGE };

  it("keeps verifiable signals and rejects fabricated evidence", () => {
    const result = parseExtraction(
      {
        signals: [
          { name: "seller_intent", value: "predaj", confidence: "high", evidence_span: "chcem predať", source_field: "message" },
          { name: "locality", value: "Košice", confidence: "high", evidence_span: "v Košiciach", source_field: "message" },
        ],
      },
      sources,
    );

    expect(result.signals.map((s) => s.name)).toEqual(["seller_intent"]);
    expect(result.rejected).toEqual([
      { name: "locality", reason: "evidence_span does not appear in the source text" },
    ]);
  });

  it("rejects a signal citing a source it was never shown", () => {
    const result = parseExtraction(
      [{ name: "locality", value: "Prešov", confidence: "high", evidence_span: "v Prešove", source_field: "notes" }],
      sources,
    );
    expect(result.signals).toHaveLength(0);
    expect(result.rejected[0]?.reason).toMatch(/was not provided/);
  });

  it("keeps the first of a contradicting pair, deterministically", () => {
    const entries = [
      { name: "timeframe", value: "do dvoch mesiacov", confidence: "high", evidence_span: "do dvoch mesiacov", source_field: "message" },
      { name: "timeframe", value: "ideálne", confidence: "low", evidence_span: "ideálne", source_field: "message" },
    ];
    const result = parseExtraction(entries, sources);
    expect(result.signals).toHaveLength(1);
    expect(result.signals[0]?.value).toBe("do dvoch mesiacov");
    expect(result.rejected[0]?.reason).toMatch(/duplicate/);
  });

  it("refuses a response that is not a list of signals", () => {
    expect(() => parseExtraction({ ok: true }, sources)).toThrow(/expected an array/);
  });
});

function stubClient(options: { rows?: unknown[]; capture?: (rows: unknown) => void } = {}) {
  return {
    from() {
      const chain: Record<string, unknown> = {
        upsert: (rows: unknown) => {
          options.capture?.(rows);
          return Promise.resolve({ error: null });
        },
        select: () => {
          const settled = Promise.resolve({ data: options.rows ?? [], error: null });
          const q: Record<string, unknown> = { eq: () => q, then: settled.then.bind(settled) };
          return q;
        },
      };
      return chain;
    },
  } as unknown as SupabaseClient;
}

describe("persistSignals", () => {
  it("stores the extraction version with every row", async () => {
    let written: unknown;
    const client = stubClient({ capture: (rows) => (written = rows) });

    const result = await persistSignals(client, {
      agencyId: "agency-a",
      leadId: "lead-1",
      extractionVersion: "seller-signal-extractor-v1",
      signals: [signal()],
      extractedAt: new Date("2026-09-24T11:00:00.000Z"),
    });

    expect(result.written).toBe(1);
    expect(written).toEqual([
      {
        lead_id: "lead-1",
        agency_id: "agency-a",
        signal_name: "seller_intent",
        value: "predaj",
        confidence: "high",
        evidence_span: "chcem predať",
        source_field: "message",
        extraction_version: "seller-signal-extractor-v1",
        extracted_at: "2026-09-24T11:00:00.000Z",
      },
    ]);
  });

  it("refuses an unversioned extraction", async () => {
    await expect(
      persistSignals(stubClient(), {
        agencyId: "agency-a",
        leadId: "lead-1",
        extractionVersion: "",
        signals: [signal()],
      }),
    ).rejects.toThrow(/cannot be re-scored later/);
  });

  it("writing nothing is not an error", async () => {
    await expect(
      persistSignals(stubClient(), {
        agencyId: "agency-a",
        leadId: "lead-1",
        extractionVersion: "v1",
        signals: [],
      }),
    ).resolves.toEqual({ written: 0 });
  });
});

describe("readSignals", () => {
  it("maps stored rows back with their provenance", async () => {
    const client = stubClient({
      rows: [
        {
          lead_id: "lead-1",
          agency_id: "agency-a",
          signal_name: "locality",
          value: "Prešov",
          confidence: "high",
          evidence_span: "v Prešove",
          source_field: "message",
          extraction_version: "seller-signal-extractor-v1",
          extracted_at: "2026-09-24T11:00:00.000Z",
        },
      ],
    });

    const rows = await readSignals(client, "agency-a", "lead-1", "seller-signal-extractor-v1");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: "locality",
      value: "Prešov",
      extractionVersion: "seller-signal-extractor-v1",
    });
  });
});
