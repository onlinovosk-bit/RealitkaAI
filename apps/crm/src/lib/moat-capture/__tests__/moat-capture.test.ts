import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildScopedDedupeKey,
  insertMoatAiRecommendationRow,
  logAiRecommendation,
  type MoatCaptureSupabase,
} from "@/lib/moat-capture/log-ai-recommendation";
import {
  insertDealOutcomeRow,
  logDealOutcome,
  mapLeadStatusToDealOutcome,
  persistDealOutcome,
  updateLatestUnspecifiedDealOutcome,
  type DealOutcomeSupabase,
} from "@/lib/moat-capture/log-deal-outcome";
import { isMoatCaptureEnabled } from "@/lib/moat-capture/capture-config";
import { UNSPECIFIED_REASON_CODE } from "@/lib/moat-capture/reason-codes";

describe("moat-capture helpers", () => {
  beforeEach(() => {
    vi.stubEnv("CAPTURE_ENABLED", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("buildScopedDedupeKey prefixes agency_id (multi-tenant)", () => {
    expect(buildScopedDedupeKey("agency-a", "nba:lead:abc")).toBe("agency-a:nba:lead:abc");
  });

  it("mapLeadStatusToDealOutcome maps CRM won/lost only", () => {
    expect(mapLeadStatusToDealOutcome("Uzavretý")).toBe("won");
    expect(mapLeadStatusToDealOutcome("Stratený")).toBe("lost");
    expect(mapLeadStatusToDealOutcome("Neaktívny")).toBeNull();
  });

  it("insertMoatAiRecommendationRow ignores unique dedupe conflicts", async () => {
    const client: MoatCaptureSupabase = {
      from: () => ({
        insert: () => ({
          select: async () => ({ error: { message: "dup", code: "23505" } }),
        }),
        update: () => ({
          eq: async () => ({ error: null }),
        }),
      }),
    };

    await expect(
      insertMoatAiRecommendationRow(
        {
          agencyId: "a1",
          leadId: "l1",
          source: "nba",
          recommendation: "Call today",
          dedupeKey: "nba:l1:hash",
        },
        client,
      ),
    ).resolves.toBeUndefined();
  });

  it("dedupe: second insert with same scoped key is no-op on 23505", async () => {
    let calls = 0;
    const client: MoatCaptureSupabase = {
      from: () => ({
        insert: () => ({
          select: async () => {
            calls += 1;
            if (calls === 1) return { error: null };
            return { error: { message: "dup", code: "23505" } };
          },
        }),
        update: () => ({
          eq: async () => ({ error: null }),
        }),
      }),
    };

    const input = {
      agencyId: "agency-x",
      leadId: "lead-y",
      source: "nba" as const,
      recommendation: "Same action",
      dedupeKey: "nba:lead-y:deadbeef",
    };

    await insertMoatAiRecommendationRow(input, client);
    await insertMoatAiRecommendationRow(input, client);
    expect(calls).toBe(2);
  });

  it("logAiRecommendation never throws when insert fails", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() =>
      logAiRecommendation({
        agencyId: "a1",
        source: "triage",
        recommendation: "test",
      }),
    ).not.toThrow();
  });

  it("insertDealOutcomeRow uses unspecified when reason omitted", async () => {
    let captured: Record<string, unknown> | null = null;
    const client: DealOutcomeSupabase = {
      from: () => ({
        insert: async (row: Record<string, unknown>) => {
          captured = row;
          return { error: null };
        },
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: async () => ({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          }),
        }),
        update: () => ({
          eq: async () => ({ error: null }),
        }),
      }),
    };

    await insertDealOutcomeRow(
      {
        agencyId: "a1",
        leadId: "l1",
        outcome: "won",
      },
      client,
    );

    expect(captured?.reason_code).toBe(UNSPECIFIED_REASON_CODE);
  });

  it("persistDealOutcome inserts known reason without unspecified", async () => {
    let captured: Record<string, unknown> | null = null;
    const client: DealOutcomeSupabase = {
      from: () => ({
        insert: async (row: Record<string, unknown>) => {
          captured = row;
          return { error: null };
        },
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: async () => ({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          }),
        }),
        update: () => ({
          eq: async () => ({ error: null }),
        }),
      }),
    };

    await persistDealOutcome(
      {
        agencyId: "a1",
        leadId: "l1",
        outcome: "won",
        reasonCode: "cena",
        reasonText: "OK",
      },
      client,
    );

    expect(captured?.reason_code).toBe("cena");
    expect(captured?.reason_text).toBe("OK");
  });

  it("persistDealOutcome updates latest unspecified row when present", async () => {
    let updated: Record<string, unknown> | null = null;
    const client: DealOutcomeSupabase = {
      from: () => ({
        insert: async () => ({ error: null }),
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: async () => ({ data: [{ id: "row-1" }], error: null }),
                  }),
                }),
              }),
            }),
          }),
        }),
        update: (row: Record<string, unknown>) => ({
          eq: async () => {
            updated = row;
            return { error: null };
          },
        }),
      }),
    };

    await persistDealOutcome(
      {
        agencyId: "a1",
        leadId: "l1",
        outcome: "lost",
        reasonCode: "konkurencia",
      },
      client,
    );

    expect(updated?.reason_code).toBe("konkurencia");
  });

  it("updateLatestUnspecifiedDealOutcome returns false when no row", async () => {
    const client: DealOutcomeSupabase = {
      from: () => ({
        insert: async () => ({ error: null }),
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: async () => ({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          }),
        }),
        update: () => ({
          eq: async () => ({ error: null }),
        }),
      }),
    };

    const ok = await updateLatestUnspecifiedDealOutcome(
      {
        agencyId: "a1",
        leadId: "l1",
        outcome: "won",
        reasonCode: "cena",
      },
      client,
    );
    expect(ok).toBe(false);
  });

  it("logDealOutcome never throws when insert fails", () => {
    expect(() =>
      logDealOutcome({
        agencyId: "a1",
        leadId: "l1",
        outcome: "lost",
      }),
    ).not.toThrow();
  });

  it("isMoatCaptureEnabled respects CAPTURE_ENABLED=false", () => {
    vi.stubEnv("CAPTURE_ENABLED", "false");
    expect(isMoatCaptureEnabled()).toBe(false);
  });
});
