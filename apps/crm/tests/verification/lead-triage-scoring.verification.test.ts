import { describe, expect, it } from "vitest";
import {
  heuristicTriageResult,
  isSparseImportLead,
  splitLeadsForTriage,
} from "@/lib/ai/lead-triage-batch";
import {
  getLeadDisplayScore,
  isLeadHot,
  isSparseQualificationLead,
} from "@/lib/leads/lead-display-score";

describe("[verification] AI triage / lead scoring", () => {
  const sparseLead = {
    id: "l-sparse",
    name: "Import Lead",
    status: "Nový",
    score: 0,
    last_contact: "",
    note: "Import Realvia",
    source: "realvia_import",
  };

  it("splits sparse imports to heuristic Nízka triage", () => {
    expect(isSparseImportLead(sparseLead)).toBe(true);
    const { heuristic, forAi } = splitLeadsForTriage([sparseLead]);
    expect(heuristic).toHaveLength(1);
    expect(forAi).toHaveLength(0);
    expect(heuristic[0]?.priority).toBe("Nízka");
  });

  it("maps triage priority to display score for UI", () => {
    const lead = {
      score: 0,
      buyer_readiness_score: null,
      aiPriority: "Vysoká",
      aiTriageAt: "2026-06-01T10:00:00Z",
      lastContact: "2026-06-01",
    };
    expect(getLeadDisplayScore(lead)).toBe(85);
    expect(isSparseQualificationLead(lead)).toBe(false);
    expect(isLeadHot({ ...lead, status: "Nový" } as never)).toBe(true);
  });

  it("rich lead with score routes to AI batch (not sparse heuristic)", () => {
    const rich = { ...sparseLead, id: "l-rich", score: 72, last_contact: "2026-06-01" };
    expect(isSparseImportLead(rich)).toBe(false);
    const split = splitLeadsForTriage([rich]);
    expect(split.heuristic).toHaveLength(0);
    expect(split.forAi).toHaveLength(1);
    expect(split.forAi[0]?.id).toBe("l-rich");
  });
});
