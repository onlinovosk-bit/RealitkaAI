import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Directive 4: the coaching panel shows only measured numbers. Before this
 * test, a missing stats row returned "TOP 12 %", "18 DNÍ", a 3-day streak and
 * 58 % follow-up as if they were the broker's own.
 */

type Result = { data: unknown; error: { message: string } | null };

const state = vi.hoisted(() => ({
  user: { id: "broker-1" } as { id: string } | null,
  stats: { data: null, error: null } as Result,
  note: { data: null, error: null } as Result,
}));

function query(result: () => Result) {
  const q = {
    select: () => q,
    eq: () => q,
    order: () => q,
    limit: () => q,
    maybeSingle: async () => result(),
  };
  return q;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === "broker_performance_stats") return query(() => state.stats);
      if (table === "notifications") return query(() => state.note);
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

import { GET } from "../route";

const INVENTED = ["TOP 12%", "18 DNÍ", "O 4 dni", "0.58", "58%"];

async function body() {
  const res = await GET();
  const json = await res.json();
  return { status: res.status, json, raw: JSON.stringify(json) };
}

describe("GET /api/coaching/insight", () => {
  beforeEach(() => {
    state.user = { id: "broker-1" };
    state.stats = { data: null, error: null };
    state.note = { data: null, error: null };
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("returns no panel — and no numbers — when the stats table is missing (PROD today)", async () => {
    state.stats = { data: null, error: { message: 'relation "public.broker_performance_stats" does not exist' } };
    const { status, json, raw } = await body();
    expect(status).toBe(200);
    expect(json).toEqual({ ok: false, reason: "no_stats", source: "none" });
    for (const s of INVENTED) expect(raw).not.toContain(s);
  });

  it("returns no panel when the broker has no stats row", async () => {
    const { json } = await body();
    expect(json.ok).toBe(false);
    expect(json).not.toHaveProperty("followUpRankLabel");
    expect(json).not.toHaveProperty("streakDays");
  });

  it("with measured stats, shows only values that have a source", async () => {
    state.stats = {
      data: { funnel_drop_off_stage: "after_offer", follow_up_consistency: 0.72, avg_deal_velocity_days: 25 },
      error: null,
    };
    const { json, raw } = await body();
    expect(json.ok).toBe(true);
    expect(json.source).toBe("db");
    expect(json.dealVelocityLabel).toBe("25 DNÍ");
    expect(json.streakDays).toBeNull();
    expect(json.followUpRankLabel).toBeNull();
    expect(json.dealVelocityDeltaLabel).toBeNull();
    expect(json.insight).toContain("72%");
    expect(raw).not.toContain("TOP 12%");
  });

  it("never substitutes a velocity when the measured one is empty", async () => {
    state.stats = {
      data: { funnel_drop_off_stage: null, follow_up_consistency: 0.5, avg_deal_velocity_days: null },
      error: null,
    };
    const { json } = await body();
    expect(json.dealVelocityLabel).toBeNull();
  });

  it("prefers a stored AI coaching tip for the insight text", async () => {
    state.stats = { data: { follow_up_consistency: 0.5, avg_deal_velocity_days: 10 }, error: null };
    state.note = { data: { content: "Tip od AI" }, error: null };
    const { json } = await body();
    expect(json.insight).toBe("Tip od AI");
  });

  it("401 without a user", async () => {
    state.user = null;
    const res = await GET();
    expect(res.status).toBe(401);
  });
});
