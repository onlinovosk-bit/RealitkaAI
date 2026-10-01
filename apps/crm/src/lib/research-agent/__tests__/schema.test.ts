import { describe, expect, it } from "vitest";

import { dossierSchema } from "@/lib/research-agent/schema";

describe("research dossier schema", () => {
  it("accepts valid dossier json", () => {
    const parsed = dossierSchema.parse({
      owner: "John Doe",
      estimated_value_eur: 250000,
      company_ico: null,
      risk_flags: [],
      signals: [{ label: "owner_resolved", confidence: 0.8, source: "enrichment" }],
      sources: ["enrichment-engine"],
      null_reasons: { company_ico: "Missing in source data." },
    });
    expect(parsed.owner).toBe("John Doe");
  });

  it("rejects malformed dossier json", () => {
    const bad = {
      owner: "John Doe",
      estimated_value_eur: "250000",
      company_ico: null,
      risk_flags: [],
      signals: [],
      sources: [],
      null_reasons: {},
    };
    expect(() => dossierSchema.parse(bad)).toThrow();
  });
});
