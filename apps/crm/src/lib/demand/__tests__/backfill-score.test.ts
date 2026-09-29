import { describe, expect, it } from "vitest";
import { LABEL_COLUMNS, labelRows, parseCsv, scoreLabels } from "../backfill-score";
import { emptyDemand } from "../contract";

describe("labeling sheet", () => {
  it("round-trips quotes, commas and newlines", () => {
    const d = emptyDemand();
    d.location = { value: "Košice, Terasa", confidence: 1, source: "inquiry_text", evidence: 'v "Košiciach"' };
    const csv = [LABEL_COLUMNS.join(","), ...labelRows("L1", d, "riadok 1\nriadok, 2")].join("\n");
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(12);
    const loc = rows.find((r) => r[1] === "location")!;
    expect(loc[2]).toBe("Košice, Terasa");
    expect(loc[3]).toBe('v "Košiciach"');
    expect(rows[1][7]).toBe("riadok 1\nriadok, 2");
  });
});

describe("scoreLabels", () => {
  const header = LABEL_COLUMNS.join(",");
  const row = (field: string, extracted: string, judgement: string, truth: string) =>
    ["L", field, extracted, "", "", judgement, truth, ""].join(",");

  it("computes precision, recall, unknown and false-positive rate", () => {
    const csv = [
      header,
      row("budget_max", "250000", "correct", ""),
      row("budget_max", "300000", "wrong", "250000"),
      row("budget_max", "", "", "180000"), // missed
      row("budget_max", "", "correct", ""), // correctly unknown
      row("budget_max", "", "", ""), // not labeled
    ].join("\n");
    const b = scoreLabels(csv).fields.find((f) => f.field === "budget_max")!;
    expect(b).toMatchObject({ rows: 5, labeled: 4, extracted: 2, correct: 1, wrong: 1, missed: 1 });
    expect(b.precision).toBe(0.5);
    expect(b.recall).toBe(0.5);
    expect(b.unknown_rate).toBe(0.6);
    expect(b.false_positive_rate).toBe(0.25);
  });

  it("reports null precision when nothing was extracted, and rejects a malformed sheet", () => {
    const s = scoreLabels([header, row("area_max", "", "correct", "")].join("\n"));
    expect(s.fields.find((f) => f.field === "area_max")!.precision).toBeNull();
    expect(() => scoreLabels("a,b\n1,2")).toThrow(/missing column/);
  });
});
