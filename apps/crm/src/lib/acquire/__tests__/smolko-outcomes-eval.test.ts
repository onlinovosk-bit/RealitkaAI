import { describe, expect, it } from "vitest";
import { isSparseImportLead } from "@/lib/ai/lead-triage-batch";
import {
  loadSmolkoOutcomeRecords,
  toTriageLeadInput,
} from "@/lib/acquire/smolko-outcomes-eval";

describe("smolko-outcomes-eval", () => {
  it("loads 4 gold records from jsonl", () => {
    const records = loadSmolkoOutcomeRecords();
    expect(records).toHaveLength(4);
    expect(records.map((r) => r.id)).toEqual([
      "eval-smolko-001",
      "eval-smolko-002",
      "eval-smolko-003",
      "eval-smolko-004",
    ]);
  });

  it("builds non-sparse triage inputs including weak Bazos Palenčár", () => {
    const palencar = loadSmolkoOutcomeRecords().find((r) => r.id === "eval-smolko-004");
    expect(palencar).toBeDefined();
    const input = toTriageLeadInput(palencar!);
    expect(isSparseImportLead(input)).toBe(false);
    expect(input.note).toContain("Bazoš.sk");
    expect(input.note).toContain("174767869");
    expect(input.note).toContain("aktuálny");
  });
});
