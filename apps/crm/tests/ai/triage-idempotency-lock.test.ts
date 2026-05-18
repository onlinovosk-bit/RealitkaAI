import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { tryClaimLeadTriage } from "@/ai/triage-idempotency";

/** Minimálny fluent mock pre `tryClaimLeadTriage` (insert → select / update reťazce). */
function mockAdmin(
  steps: ReadonlyArray<
    | { kind: "insert"; result: { data: unknown; error: unknown } }
    | {
        kind: "select";
        result: { data: unknown; error: unknown };
      }
    | {
        kind: "update_reclaim_stale";
        result: { data: unknown; error: unknown };
      }
  >,
): SupabaseClient {
  let idx = 0;
  return {
    from: () => {
      const step = steps[idx++];
      if (!step) {
        throw new Error(`unexpected extra from() call, idx=${idx}`);
      }
      if (step.kind === "insert") {
        return {
          insert: () => ({
            select: () => ({
              maybeSingle: async () => step.result,
            }),
          }),
        };
      }
      if (step.kind === "select") {
        const c: Record<string, unknown> = {};
        c.eq = function () {
          return c;
        };
        c.maybeSingle = async () => step.result;
        return {
          select: () => c,
        };
      }
      /* update stale reclaim */
      const c: Record<string, unknown> = {};
      c.update = function () {
        return c;
      };
      c.eq = function () {
        return c;
      };
      c.lte = function () {
        return {
          select: () => ({
            maybeSingle: async () => step.result,
          }),
        };
      };
      return c;
    },
  } as unknown as SupabaseClient;
}

describe("Scenario C: duplicate cron / lock", () => {
  const day = "2026-05-14";
  const freshIso = new Date().toISOString();
  const staleMs = 45 * 60 * 1000;

  it("druhý beh vidí lock_held keď prvý ešte spracováva (nie je stale)", async () => {
    const admin = mockAdmin([
      { kind: "insert", result: { data: null, error: { code: "23505" } } },
      {
        kind: "select",
        result: {
          data: { state: "processing", processing_started_at: freshIso },
          error: null,
        },
      },
    ]);
    const r = await tryClaimLeadTriage(admin, "L1", day, staleMs);
    expect(r).toEqual({ ok: false, reason: "lock_held" });
  });

  it("po stale lock sa dá reclaim (reclaim_stale)", async () => {
    const oldIso = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const admin = mockAdmin([
      { kind: "insert", result: { data: null, error: { code: "23505" } } },
      {
        kind: "select",
        result: {
          data: { state: "processing", processing_started_at: oldIso },
          error: null,
        },
      },
      {
        kind: "update_reclaim_stale",
        result: { data: { lead_id: "L1" }, error: null },
      },
    ]);
    const r = await tryClaimLeadTriage(admin, "L1", day, staleMs);
    expect(r).toEqual({ ok: true, path: "reclaim_stale" });
  });

  it("už dokončený deň → already_completed", async () => {
    const admin = mockAdmin([
      { kind: "insert", result: { data: null, error: { code: "23505" } } },
      {
        kind: "select",
        result: {
          data: { state: "completed", processing_started_at: freshIso },
          error: null,
        },
      },
    ]);
    const r = await tryClaimLeadTriage(admin, "L1", day, staleMs);
    expect(r).toEqual({ ok: false, reason: "already_completed" });
  });
});
