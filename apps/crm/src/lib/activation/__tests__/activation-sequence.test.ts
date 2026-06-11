import { describe, expect, it } from "vitest";
import { classifyActivationState, daysSince, isActivated } from "../health";
import { pickActivationEmailNode } from "../sequence";
import type { AgencyActivationSnapshot } from "../types";

function base(over: Partial<AgencyActivationSnapshot> = {}): AgencyActivationSnapshot {
  return {
    agencyId: "a1",
    agencyName: "Test RK",
    agencyCreatedAt: new Date().toISOString(),
    ownerEmail: "owner@test.sk",
    ownerName: "Majitel",
    painMirror: "nevieš, komu volať ako prvému",
    hasImport: false,
    scoredLeadCount: 0,
    highestScore: null,
    morningReportEnabled: false,
    lastLoginAt: null,
    daysSinceSignup: 0,
    optOut: false,
    ...over,
  };
}

describe("activation health S0–S4", () => {
  it("S0 without import", () => {
    expect(classifyActivationState(base())).toBe("S0");
  });

  it("S1 import without scored leads", () => {
    expect(classifyActivationState(base({ hasImport: true }))).toBe("S1");
  });

  it("S2 scored leads without morning report", () => {
    expect(
      classifyActivationState(base({ hasImport: true, scoredLeadCount: 3, highestScore: 80 })),
    ).toBe("S2");
  });

  it("S3 activated stops sequence", () => {
    const s = base({
      hasImport: true,
      scoredLeadCount: 2,
      highestScore: 70,
      morningReportEnabled: true,
    });
    expect(isActivated(s)).toBe(true);
    expect(classifyActivationState(s)).toBe("S3");
    const decision = pickActivationEmailNode(s, new Set(["d0", "d2_s2"]));
    expect(decision.node).toBeNull();
    expect(decision.reason).toBe("activated_sequence_stopped");
  });

  it("S4 risk at D5+ stale", () => {
    const s = base({
      daysSinceSignup: 6,
      lastLoginAt: new Date(Date.now() - 96 * 3600 * 1000).toISOString(),
    });
    expect(classifyActivationState(s)).toBe("S4");
  });
});

describe("activation email sequence", () => {
  it("D0 welcome for new signup", () => {
    const d = pickActivationEmailNode(base({ daysSinceSignup: 0 }), new Set());
    expect(d.node).toBe("d0");
  });

  it("D2 branches by state", () => {
    expect(
      pickActivationEmailNode(base({ daysSinceSignup: 2 }), new Set(["d0"])).node,
    ).toBe("d2_s0");
    expect(
      pickActivationEmailNode(
        base({ daysSinceSignup: 2, hasImport: true }),
        new Set(["d0"]),
      ).node,
    ).toBe("d2_s1");
    expect(
      pickActivationEmailNode(
        base({ daysSinceSignup: 2, hasImport: true, scoredLeadCount: 1 }),
        new Set(["d0"]),
      ).node,
    ).toBe("d2_s2");
  });

  it("D5 founder draft for S4 not auto customer", () => {
    const s = base({
      daysSinceSignup: 5,
      lastLoginAt: new Date(Date.now() - 96 * 3600 * 1000).toISOString(),
    });
    const d = pickActivationEmailNode(s, new Set(["d0", "d2_s0"]));
    expect(d.node).toBe("d5_founder_draft");
    expect(d.founderDraftOnly).toBe(true);
  });

  it("D7 only when activated at day 7+", () => {
    const s = base({
      daysSinceSignup: 7,
      hasImport: true,
      scoredLeadCount: 2,
      highestScore: 66,
      morningReportEnabled: true,
    });
    const d = pickActivationEmailNode(s, new Set());
    expect(d.node).toBe("d7_activated");
  });

  it("daysSince computes whole days", () => {
    const iso = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
    expect(daysSince(iso)).toBe(3);
  });
});

describe("ONBOARDING_EMAILS_ENABLED", () => {
  it("defaults off", async () => {
    const prev = process.env.ONBOARDING_EMAILS_ENABLED;
    delete process.env.ONBOARDING_EMAILS_ENABLED;
    const { isOnboardingEmailsEnabled } = await import("../flags");
    expect(isOnboardingEmailsEnabled()).toBe(false);
    process.env.ONBOARDING_EMAILS_ENABLED = prev;
  });
});
