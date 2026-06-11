import { describe, expect, it } from "vitest";
import {
  computeIcpScore,
  isFranchiseBrand,
  scoreTeamSizeEstimate,
} from "../../../../scripts/prospecting/lib/scoring.ts";
import type { EnrichedRecord, FinStatRow } from "../../../../scripts/prospecting/lib/types.ts";

const baseRow: FinStatRow = {
  ico: "12345678",
  nazov: "RK Test Prešov",
  web: "https://rk-test.sk",
  kraj: "Prešovský",
  mesto: "Prešov",
  zamestnanci: 6,
  konatel: "Peter Novák",
  email: "info@rk-test.sk",
  telefon: "+421900000000",
  outreach_email: "info@rk-test.sk",
  outreach_email_flag: "company",
};

const enriched: EnrichedRecord = {
  ico: "12345678",
  domain: "rk-test.sk",
  enriched_at: new Date().toISOString(),
  status: "ok",
  team_size_estimate: 6,
  portals_detected: ["nehnutelnosti.sk", "topreality.sk"],
  crm_signals: [],
  has_modern_web: true,
  konatel_on_web_as_broker: true,
  pages_fetched: [],
};

describe("[verification] Root prospecting ICP scoring", () => {
  it("weights ideal team size 3-10", () => {
    expect(scoreTeamSizeEstimate(6)).toBe(30);
    expect(scoreTeamSizeEstimate(1)).toBe(10);
  });

  it("scores non-franchise ICP above 80", () => {
    const result = computeIcpScore(baseRow, enriched);
    expect(result.disqualified).toBe(false);
    expect(result.icp_score).toBeGreaterThanOrEqual(80);
  });

  it("disqualifies franchise brands", () => {
    expect(isFranchiseBrand("RE/MAX Prešov")).toBe(true);
    const result = computeIcpScore({ ...baseRow, nazov: "RE/MAX Prešov" }, enriched);
    expect(result.disqualified).toBe(true);
    expect(result.icp_score).toBe(0);
  });
});
