import { describe, expect, it } from "vitest";
import { demoAccentLines, extractEmailDomain, parseDemoUtm } from "../utm-parse";

describe("parseDemoUtm", () => {
  it("parses goals and calc_loss from utm_content", () => {
    const r = parseDemoUtm("goals_leads_followup|calc_loss_2400");
    expect(r.goals).toEqual(["leads", "followup"]);
    expect(r.calcLossMonthly).toBe(2400);
  });

  it("returns empty for blank content", () => {
    expect(parseDemoUtm("")).toEqual({ goals: [], calcLossMonthly: null });
  });
});

describe("extractEmailDomain", () => {
  it("extracts domain lowercased", () => {
    expect(extractEmailDomain("Makler@RK-Presov.sk")).toBe("rk-presov.sk");
  });
});

describe("demoAccentLines", () => {
  it("returns three accent lines", () => {
    const lines = demoAccentLines(["leads", "import"]);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("Lead triáž");
  });
});
