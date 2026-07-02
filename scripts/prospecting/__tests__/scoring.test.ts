import { describe, it, expect } from "vitest";
import {
  computeIcpScore,
  scoreTeamSizeEstimate,
  scoreFinstatEmployees,
  scorePortals,
  isFranchiseBrand,
  checkDisqualified,
} from "../lib/scoring.ts";
import type { EnrichedRecord, FinStatRow } from "../lib/types.ts";

const baseRow: FinStatRow = {
  ico: "123",
  nazov: "RK Test Prešov",
  web: "https://rk-test.sk",
  kraj: "Prešovský",
  mesto: "Prešov",
  zamestnanci: 5,
  konatel: "Peter Novák",
  email: "info@rk-test.sk",
  telefon: "+421900000000",
  outreach_email: "info@rk-test.sk",
  outreach_email_flag: "company",
};

const enrichedOk: EnrichedRecord = {
  ico: "123",
  domain: "rk-test.sk",
  enriched_at: new Date().toISOString(),
  status: "ok",
  team_size_estimate: 5,
  portals_detected: ["nehnutelnosti.sk", "topreality.sk"],
  crm_signals: [],
  has_modern_web: true,
  konatel_on_web_as_broker: true,
  pages_fetched: [],
};

describe("ICP scoring weights", () => {
  it("team 3-10 → 30", () => expect(scoreTeamSizeEstimate(5)).toBe(30));
  it("team 1-2 → 10", () => expect(scoreTeamSizeEstimate(2)).toBe(10));
  it("team 11-15 → 15", () => expect(scoreTeamSizeEstimate(12)).toBe(15));
  it("finstat 3-10 → 25", () => expect(scoreFinstatEmployees(7)).toBe(25));
  it("portals ≥2 → 15", () => expect(scorePortals(["a", "b"])).toBe(15));
});

describe("computeIcpScore", () => {
  it("scores ideal ICP near 100", () => {
    const r = computeIcpScore(baseRow, enrichedOk);
    expect(r.disqualified).toBe(false);
    expect(r.icp_score).toBeGreaterThanOrEqual(85);
  });

  it("disqualifies franchise", () => {
    const row = { ...baseRow, nazov: "RE/MAX Prešov" };
    expect(isFranchiseBrand(row.nazov)).toBe(true);
    const r = computeIcpScore(row, enrichedOk);
    expect(r.disqualified).toBe(true);
    expect(r.icp_score).toBe(0);
  });

  it("disqualifies solo without web", () => {
    const row = { ...baseRow, web: "", zamestnanci: 1 };
    expect(checkDisqualified(row, null).disqualified).toBe(true);
  });
});
