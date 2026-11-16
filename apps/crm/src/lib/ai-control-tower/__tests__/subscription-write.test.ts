import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

const payload = {
  provider: "claude",
  accountRef: "shared",
  quotaWindow: "weekly" as const,
  usedPercent: 20,
  remainingPercent: 80,
  resetAt: "2026-11-23T12:00:00.000Z",
  resetTimezone: "Europe/Bratislava",
  capturedAt: "2026-11-16T11:00:00.000Z",
  note: "ok",
};

describe("writeManualSubscriptionSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("rejects invalid percents before touching the database", async () => {
    const { writeManualSubscriptionSnapshot } = await import("../subscription-write");
    const result = await writeManualSubscriptionSnapshot({
      ...payload,
      usedPercent: 150,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("inserts a new sample for an existing pool identity", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const insert = vi.fn().mockResolvedValue({ error: null });
    mocks.createServiceRoleClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "ai_quota_pools") return { upsert };
        return { insert };
      }),
    });
    const { writeManualSubscriptionSnapshot } = await import("../subscription-write");
    const result = await writeManualSubscriptionSnapshot(payload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.inserted).toBe(true);
      expect(result.snapshot.poolId).toBe("claude:shared:weekly");
    }
    expect(upsert).toHaveBeenCalledOnce();
    expect(insert).toHaveBeenCalledOnce();
  });

  it("updates the same captured_at instead of duplicating it", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const insert = vi.fn().mockResolvedValue({ error: { code: "23505" } });
    const eq2 = vi.fn().mockResolvedValue({ error: null });
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    const update = vi.fn().mockReturnValue({ eq: eq1 });
    mocks.createServiceRoleClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "ai_quota_pools") return { upsert };
        return { insert, update };
      }),
    });
    const { writeManualSubscriptionSnapshot } = await import("../subscription-write");
    const result = await writeManualSubscriptionSnapshot(payload);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.inserted).toBe(false);
    expect(update).toHaveBeenCalledOnce();
  });
});
