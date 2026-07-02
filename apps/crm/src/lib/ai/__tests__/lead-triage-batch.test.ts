import { describe, expect, it } from "vitest";
import {
  heuristicTriageResult,
  isSparseImportLead,
  splitLeadsForTriage,
  TRIAGE_LOW_CONTEXT_REASON,
} from "@/lib/ai/lead-triage-batch";

describe("lead-triage-batch sparse import", () => {
  const sparse = {
    id: "lead-1",
    name: "Adamovičová",
    status: "Nový",
    score: 0,
    last_contact: "",
    note: "Import Realvia 2026",
    source: "realvia_import_smolko",
  };

  const rich = {
    ...sparse,
    id: "lead-2",
    score: 72,
    last_contact: "2026-01-15",
    note: "Chce 3-izb v Poprade, volal včera",
  };

  it("detects sparse import leads", () => {
    expect(isSparseImportLead(sparse)).toBe(true);
    expect(isSparseImportLead(rich)).toBe(false);
  });

  it("assigns Nízka heuristic without Stredná default", () => {
    const row = heuristicTriageResult(sparse);
    expect(row.priority).toBe("Nízka");
    expect(row.reason).toBe(TRIAGE_LOW_CONTEXT_REASON);
  });

  it("splits batch for heuristic vs AI", () => {
    const { heuristic, forAi } = splitLeadsForTriage([sparse, rich]);
    expect(heuristic).toHaveLength(1);
    expect(forAi).toHaveLength(1);
    expect(heuristic[0]?.lead_id).toBe("lead-1");
  });
});
