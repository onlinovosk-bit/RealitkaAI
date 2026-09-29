import { describe, expect, it } from "vitest";
import { GATE, LABEL_COLUMNS, labelRows, parseCsv, scoreLabels } from "../backfill-score";
import { emptyDemand } from "../contract";

const header = LABEL_COLUMNS.join(",");
// lead_id, field, extracted_value, extracted_evidence, rejected, evidence_present, gold_value, evidence_span, inquiry_text
const row = (field: string, extracted: string, evidence: string, present: string, gold: string, span: string) =>
  ["L", field, extracted, evidence, "", present, gold, span, ""].map((c) => `"${c}"`).join(",");

describe("labeling sheet", () => {
  it("round-trips quotes, commas and newlines", () => {
    const d = emptyDemand();
    d.location = { value: "Košice, Terasa", confidence: 1, source: "inquiry_text", evidence: 'v "Košiciach"' };
    const csv = [header, ...labelRows("L1", d, "riadok 1\nriadok, 2")].join("\n");
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(12);
    const loc = rows.find((r) => r[1] === "location")!;
    expect(loc[2]).toBe("Košice, Terasa");
    expect(loc[3]).toBe('v "Košiciach"');
    expect(rows[1][8]).toBe("riadok 1\nriadok, 2");
  });
});

describe("scoreLabels — outcomes", () => {
  it("does not penalize a correct UNKNOWN, counts misses and false values separately", () => {
    const csv = [
      header,
      row("budget_max", "250000", "do 250 000 €", "y", "250 000", "do 250 000 €"), // correct, grounded
      row("budget_max", "300000", "do 300 000 €", "y", "250000", "do 250 000 €"), // wrong value
      row("budget_max", "", "", "y", "180000", "do 180 tisíc"), // missed
      row("budget_max", "", "", "n", "", ""), // correct unknown — NOT an error
      row("budget_max", "90000", "90 000", "n", "", ""), // unsupported
      row("budget_max", "", "", "", "", ""), // not labeled
    ].join("\n");
    const m = scoreLabels(csv).fields.budget_max;
    expect(m).toMatchObject({
      rows: 6, labeled: 5, extracted: 3,
      correct: 1, correct_unknown: 1, missed: 1, false_value: 2, unsupported: 1, evidence_grounded: 1,
    });
    expect(m.precision).toBeCloseTo(1 / 3);
    expect(m.recall).toBe(0.5);
    expect(m.accuracy).toBe(0.4);
    expect(m.false_value_rate).toBe(0.4);
  });

  it("rejects a malformed or empty sheet", () => {
    expect(() => scoreLabels("")).toThrow(/empty/);
    expect(() => scoreLabels("a,b\n1,2")).toThrow(/missing column/);
  });
});

describe("scoreLabels — production gate", () => {
  const passingGroup = (field: string, n: number, gold: string) =>
    Array.from({ length: n }, () => row(field, gold, gold, "y", gold, gold));

  it("PASSES only when every group has enough support, precision and no unsupported values", () => {
    const csv = [
      header,
      ...passingGroup("location", GATE.minSupport, "Petržalka"),
      ...passingGroup("budget_max", GATE.minSupport, "200000"),
      ...passingGroup("property_type", GATE.minSupport, "byt"),
      ...passingGroup("rooms_min", GATE.minSupport, "3"),
      ...passingGroup("disposition", GATE.minSupport, "kupa"),
      ...Array.from({ length: 50 }, () => row("area_max", "", "", "n", "", "")),
    ].join("\n");
    const r = scoreLabels(csv);
    expect(r.gates.map((g) => g.verdict)).toEqual(["PASS", "PASS", "PASS", "PASS", "PASS"]);
    expect(r.verdict).toBe("PASS");
  });

  it("is INSUFFICIENT with too little support — never a silent PASS", () => {
    const r = scoreLabels([header, ...passingGroup("location", 3, "Petržalka")].join("\n"));
    expect(r.gates.find((g) => g.group === "location")!.verdict).toBe("INSUFFICIENT");
    expect(r.verdict).toBe("INSUFFICIENT");
  });

  it("FAILS on a single unsupported value, whatever the precision", () => {
    const csv = [
      header,
      ...passingGroup("location", 40, "Petržalka"),
      row("location", "Ružinov", "Ružinov", "n", "", ""),
    ].join("\n");
    const r = scoreLabels(csv);
    const loc = r.gates.find((g) => g.group === "location")!;
    expect(loc.verdict).toBe("FAIL");
    expect(loc.reasons.join()).toMatch(/unsupported=1/);
    expect(r.verdict).toBe("FAIL");
  });
});
