import { describe, expect, it } from "vitest";
import {
  buildEmptyInsights,
  buildDataFallback,
  hasTenantData,
} from "@/lib/ai/dashboard-insights";
import {
  DASHBOARD_INSIGHTS_OVERDUE_FOLLOWUP_DAYS,
  overdueFollowupCutoffIso,
} from "@/lib/ai/dashboard-insights-gather";

const emptySummary = {
  period: "today" as const,
  totals: {
    newLeads: 0,
    activeLeads: 0,
    hotLeads: 0,
    dealsInPipeline: 0,
    dealsWon: 0,
  },
  buyerReadiness: { averageScore: 0, hotCount: 0, warmCount: 0, coldCount: 0 },
  topHotLeads: [],
  activity: { callsToday: 0, emailsToday: 0, viewingsScheduled: 0 },
};

describe("[verification] Dashboard insights cron lib", () => {
  it("detects empty tenant and returns onboarding empty insights", () => {
    expect(hasTenantData(emptySummary)).toBe(false);
    const out = buildEmptyInsights("Peter");
    expect(out.headline).toContain("Peter");
    expect(out.actions).toHaveLength(0);
  });

  it("builds deterministic data fallback from summary without LLM", () => {
    const summary = {
      ...emptySummary,
      totals: { ...emptySummary.totals, activeLeads: 5, hotLeads: 2 },
      topHotLeads: [
        {
          id: "lead-1",
          name: "Ján",
          segment: "buyer" as const,
          readinessScore: 88,
          lastActivityAt: "2026-06-01T10:00:00Z",
        },
      ],
    };
    expect(hasTenantData(summary)).toBe(true);
    const fallback = buildDataFallback({ period: "today", summary, userName: "Peter" });
    expect(fallback.actions.length).toBeGreaterThan(0);
    expect(fallback.actions[0]?.relatedLeadIds).toContain("lead-1");
  });

  it("computes overdue follow-up cutoff for gather queries", () => {
    const cutoff = overdueFollowupCutoffIso(DASHBOARD_INSIGHTS_OVERDUE_FOLLOWUP_DAYS);
    expect(Date.parse(cutoff)).toBeLessThan(Date.now());
  });
});
