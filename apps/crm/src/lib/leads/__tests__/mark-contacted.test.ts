// ================================================================
// Revolis.AI — leads.last_contact_at is written when we reach the lead
//
// Before this module nothing in the repository wrote the column. Measured on
// production 2026-10-02: 0 of 520 rows carried a value, while ten surfaces
// read it (AiInsightsPanel, dead-lead campaign, rescue trigger, daily actions,
// call-script, sales-brain, deal-strategy, dashboard summary). #735 had to
// report "nemerané" in the morning brief for exactly that reason.
//
// Every test below fails against an implementation that drops the guard, the
// fail-soft, or the ok-only condition.
// ================================================================
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { markLeadContacted } from "../mark-contacted";

const LEAD = "11111111-1111-1111-1111-111111111111";
const AT = "2026-10-02T08:00:00.000Z";

interface Recorded {
  table: string;
  payload: Record<string, unknown> | null;
  filters: Record<string, unknown>;
  or: string[];
  selected: string | null;
}

/** Minimal chainable Supabase double that records the whole query shape. */
function makeClient(resolve: { data: unknown; error: { message: string } | null }) {
  const recorded: Recorded[] = [];

  const client = {
    from(table: string) {
      const entry: Recorded = { table, payload: null, filters: {}, or: [], selected: null };
      recorded.push(entry);

      const builder: Record<string, unknown> = {};
      Object.assign(builder, {
        update: (payload: Record<string, unknown>) => {
          entry.payload = payload;
          return builder;
        },
        eq: (col: string, val: unknown) => {
          entry.filters[`eq:${col}`] = val;
          return builder;
        },
        or: (expr: string) => {
          entry.or.push(expr);
          return builder;
        },
        select: (cols: string) => {
          entry.selected = cols;
          return Promise.resolve(resolve);
        },
      });
      return builder;
    },
  } as unknown as SupabaseClient;

  return { client, recorded };
}

describe("markLeadContacted", () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    errSpy.mockRestore();
  });

  it("stamps last_contact_at on the named lead", async () => {
    const { client, recorded } = makeClient({ data: [{ id: LEAD }], error: null });

    const result = await markLeadContacted(client, LEAD, AT);

    expect(result).toEqual({ stamped: true });
    expect(recorded).toHaveLength(1);
    expect(recorded[0].table).toBe("leads");
    expect(recorded[0].payload).toEqual({ last_contact_at: AT });
    expect(recorded[0].filters).toHaveProperty("eq:id", LEAD);
  });

  it("never moves the stamp backwards", async () => {
    // Sends are not ordered: a retry or a queued job can arrive with an older
    // timestamp than one already stored. A stamp that rewinds would resurrect
    // a lead into a staleness report it had already left.
    const { client, recorded } = makeClient({ data: [], error: null });

    const result = await markLeadContacted(client, LEAD, AT);

    expect(recorded[0].or.join("|")).toContain(`last_contact_at.lt.${AT}`);
    // The null branch is what lets the FIRST stamp through: a NULL column
    // fails `lt` on its own, so without it no lead would ever be stamped.
    expect(recorded[0].or.join("|")).toContain("last_contact_at.is.null");
    // Guard matched nothing -> no row changed, and that is not an error.
    expect(result).toEqual({ stamped: false });
  });

  it("asks for the changed rows, so 'stamped' is measured and not assumed", async () => {
    const { client, recorded } = makeClient({ data: [{ id: LEAD }], error: null });

    await markLeadContacted(client, LEAD, AT);

    expect(recorded[0].selected).toBe("id");
  });

  it("fails soft: a write error is reported, never thrown", async () => {
    // The e-mail has already left when this runs. Throwing here would turn a
    // delivered message into a reported failure.
    const { client } = makeClient({ data: null, error: { message: "permission denied" } });

    const result = await markLeadContacted(client, LEAD, AT);

    expect(result).toEqual({ stamped: false, error: "permission denied" });
    expect(errSpy).toHaveBeenCalled();
  });

  it("does not report a stamp when the lead id matches nothing", async () => {
    const { client } = makeClient({ data: [], error: null });

    await expect(markLeadContacted(client, "does-not-exist", AT)).resolves.toEqual({
      stamped: false,
    });
  });

  it("writes last_contact_at and nothing else", async () => {
    // The column is the whole job. Touching status, score or updated_at from
    // here would make a contact stamp look like a pipeline change to every
    // surface that watches those.
    const { client, recorded } = makeClient({ data: [{ id: LEAD }], error: null });

    await markLeadContacted(client, LEAD, AT);

    expect(Object.keys(recorded[0].payload ?? {})).toEqual(["last_contact_at"]);
  });
});
