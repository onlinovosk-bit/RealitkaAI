import { describe, expect, it } from "vitest";

import { computeBackoffRunAfterISO } from "@/queue/backoff";

describe("computeBackoffRunAfterISO", () => {
  it("increases delay exponentially and caps at 30 minutes", () => {
    const t0 = Date.UTC(2026, 0, 1, 12, 0, 0);
    const d0 = new Date(computeBackoffRunAfterISO(0, t0)).getTime() - t0;
    const d1 = new Date(computeBackoffRunAfterISO(1, t0)).getTime() - t0;
    const d5 = new Date(computeBackoffRunAfterISO(5, t0)).getTime() - t0;
    const d10 = new Date(computeBackoffRunAfterISO(10, t0)).getTime() - t0;
    const d20 = new Date(computeBackoffRunAfterISO(20, t0)).getTime() - t0;

    expect(d0).toBe(30_000);
    expect(d1).toBe(60_000);
    expect(d5).toBe(960_000); // 30s * 2^5
    expect(d10).toBe(30 * 60_000); // cap
    expect(d20).toBe(30 * 60_000);
  });
});
