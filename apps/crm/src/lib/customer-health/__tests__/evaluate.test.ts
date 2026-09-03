import { describe, expect, it } from "vitest";
import {
  evaluateAgencyHealth,
  sortAgencyHealthResults,
} from "@/lib/customer-health/evaluate";
import { CUSTOMER_HEALTH_THRESHOLDS as T } from "@/lib/customer-health/thresholds";
import type { AgencyHealthResult } from "@/lib/customer-health/types";

function base(over: Partial<Parameters<typeof evaluateAgencyHealth>[0]> = {}) {
  return evaluateAgencyHealth({
    agencyId: "a1",
    agencyName: "Test",
    daysSinceLastLead: 0,
    daysSinceOwnerLogin: 0,
    neverLoggedInShare: 0,
    profileCount: 12,
    anyTeamLoginWithin30d: true,
    isPaying: false,
    ...over,
  });
}

describe("evaluateAgencyHealth thresholds", () => {
  it("lead silence: orange above 3 days, red above 7", () => {
    expect(base({ daysSinceLastLead: T.DAYS_SINCE_LEAD_ORANGE }).severity).toBeNull();
    expect(base({ daysSinceLastLead: T.DAYS_SINCE_LEAD_ORANGE + 0.1 }).severity).toBe(
      "orange",
    );
    // 7 days is still orange (>3), red only when strictly >7
    expect(base({ daysSinceLastLead: T.DAYS_SINCE_LEAD_RED }).severity).toBe("orange");
    expect(base({ daysSinceLastLead: T.DAYS_SINCE_LEAD_RED + 0.01 }).severity).toBe("red");
  });

  it("owner login stale: orange above 14 days", () => {
    expect(
      base({ daysSinceOwnerLogin: T.DAYS_SINCE_OWNER_LOGIN_ORANGE }).severity,
    ).toBeNull();
    expect(
      base({ daysSinceOwnerLogin: T.DAYS_SINCE_OWNER_LOGIN_ORANGE + 1 }).severity,
    ).toBe("orange");
  });

  it("never-logged-in share: orange above 50%", () => {
    expect(base({ neverLoggedInShare: 0.5 }).severity).toBeNull();
    expect(base({ neverLoggedInShare: 0.51 }).severity).toBe("orange");
  });

  it("no team login 30d → red", () => {
    expect(base({ anyTeamLoginWithin30d: false }).severity).toBe("red");
  });

  it("agency with no leads and no logins is RED", () => {
    const r = base({
      daysSinceLastLead: null,
      neverLoggedInShare: 1,
      anyTeamLoginWithin30d: false,
      profileCount: 12,
    });
    expect(r.severity).toBe("red");
    expect(r.signals.some((s) => s.code === "LEAD_SILENCE")).toBe(true);
    expect(r.signals.some((s) => s.code === "TEAM_LOGIN_SILENCE")).toBe(true);
  });

  it("paying agency bumps orange silence to red", () => {
    const unpaid = base({ daysSinceLastLead: 5, isPaying: false });
    const paid = base({ daysSinceLastLead: 5, isPaying: true });
    expect(unpaid.severity).toBe("orange");
    expect(paid.severity).toBe("red");
  });

  it("acceptance: Smolko-like — 37d no lead + 12/12 never logged in → RED (two reasons)", () => {
    const r = base({
      agencyName: "Reality Smolko",
      daysSinceLastLead: 37,
      neverLoggedInShare: 1,
      profileCount: 12,
      anyTeamLoginWithin30d: false,
      isPaying: true,
    });
    expect(r.severity).toBe("red");
    const codes = r.signals.map((s) => s.code);
    expect(codes).toContain("LEAD_SILENCE");
    expect(codes).toContain("NEVER_LOGGED_IN_SHARE");
    expect(codes).toContain("TEAM_LOGIN_SILENCE");
    expect(r.signals.filter((s) => s.code === "LEAD_SILENCE")[0]?.severity).toBe("red");
    expect(r.signals.filter((s) => s.code === "NEVER_LOGGED_IN_SHARE")[0]?.severity).toBe(
      "red",
    );
  });
});

describe("sortAgencyHealthResults", () => {
  it("orders paying before unpaid", () => {
    const rows: AgencyHealthResult[] = [
      {
        agencyId: "2",
        agencyName: "Free Co",
        isPaying: false,
        severity: "red",
        signals: [],
      },
      {
        agencyId: "1",
        agencyName: "Reality Smolko",
        isPaying: true,
        severity: "red",
        signals: [],
      },
    ];
    const sorted = sortAgencyHealthResults(rows);
    expect(sorted[0]?.agencyName).toBe("Reality Smolko");
  });
});
