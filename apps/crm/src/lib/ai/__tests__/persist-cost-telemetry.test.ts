import { beforeEach, describe, expect, it, vi } from "vitest";

const { fromMock, insertMock, createClientMock } = vi.hoisted(() => {
  const insertMock = vi.fn();
  const fromMock = vi.fn(() => ({ insert: insertMock }));
  const createClientMock = vi.fn(() => ({ from: fromMock }));
  return { fromMock, insertMock, createClientMock };
});

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => createClientMock(),
}));

import {
  isMissingCostColumnError,
  persistAiCostTelemetry,
} from "../persist-cost-telemetry";

describe("persist-cost-telemetry", () => {
  beforeEach(() => {
    insertMock.mockReset();
    fromMock.mockClear();
    createClientMock.mockClear();
    createClientMock.mockReturnValue({ from: fromMock });
  });

  it("isMissingCostColumnError detects prod-style PostgREST errors", () => {
    expect(
      isMissingCostColumnError(
        'Could not find the "cost_eur" column of "ai_action_audit" in the schema cache',
      ),
    ).toBe(true);
    expect(isMissingCostColumnError("duplicate key value")).toBe(false);
  });

  it("returns full mode when cost columns exist", async () => {
    insertMock.mockResolvedValueOnce({ error: null });
    const result = await persistAiCostTelemetry({
      agencyId: "agency-1",
      feature: "dashboard_insights",
      costEur: 0.0123,
      model: "claude-haiku",
      latencyMs: 400,
      creditsSpent: 1,
    });
    expect(result).toEqual({ ok: true, mode: "full" });
    expect(insertMock).toHaveBeenCalledOnce();
    expect(insertMock.mock.calls[0][0]).toMatchObject({
      cost_eur: 0.0123,
      model: "claude-haiku",
      meta: expect.objectContaining({ costEur: 0.0123, feature: "dashboard_insights" }),
    });
  });

  it("falls back to meta-only insert when cost_eur column is missing (AP-010)", async () => {
    insertMock
      .mockResolvedValueOnce({
        error: {
          message:
            'Could not find the "cost_eur" column of "ai_action_audit" in the schema cache',
        },
      })
      .mockResolvedValueOnce({ error: null });

    const result = await persistAiCostTelemetry({
      agencyId: "agency-1",
      feature: "dashboard_insights",
      costEur: 0.0042,
      model: "claude-haiku",
      latencyMs: 900,
    });

    expect(result).toEqual({ ok: true, mode: "meta_fallback" });
    expect(insertMock).toHaveBeenCalledTimes(2);
    const fallbackRow = insertMock.mock.calls[1][0];
    expect(fallbackRow.cost_eur).toBeUndefined();
    expect(fallbackRow.meta).toMatchObject({
      feature: "dashboard_insights",
      costEur: 0.0042,
      model: "claude-haiku",
      latencyMs: 900,
    });
  });
});
