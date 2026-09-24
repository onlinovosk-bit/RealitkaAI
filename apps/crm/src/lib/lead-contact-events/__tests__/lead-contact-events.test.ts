import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getFirstContactAttemptAt,
  recordContactAttempt,
  resolveFirstContactAttempt,
} from "@/lib/lead-contact-events/store";
import {
  CONTACT_ATTEMPT_EVENT_TYPE,
  ContactEventValidationError,
  type RecordContactAttemptInput,
} from "@/lib/lead-contact-events/types";

/** Minimal stand-in for the two Supabase calls this module makes. */
function stubClient(options: { rows?: unknown[]; capture?: (row: Record<string, unknown>) => void } = {}) {
  return {
    from() {
      return {
        insert(row: Record<string, unknown>) {
          options.capture?.(row);
          return {
            select: () => ({ single: async () => ({ data: { id: "evt-1" }, error: null }) }),
          };
        },
        select() {
          // Supabase chains `.eq()` any number of times and is awaited at the
          // end, so the stub is a thenable that returns itself from `.eq()`.
          const settled = Promise.resolve({ data: options.rows ?? [], error: null });
          const chain = {
            eq: () => chain,
            then: settled.then.bind(settled),
          };
          return chain;
        },
      };
    },
  } as unknown as SupabaseClient;
}

const leadInAgency = async () => ({ found: true, agencyId: "agency-a" });

function validInput(overrides: Partial<RecordContactAttemptInput> = {}): RecordContactAttemptInput {
  return {
    agencyId: "agency-a",
    leadId: "lead-1",
    actorProfileId: "profile-1",
    occurredAt: new Date("2026-09-24T07:30:00.000Z"),
    channel: "call",
    source: "manual",
    ...overrides,
  };
}

describe("resolveFirstContactAttempt", () => {
  it("returns none when the lead has no contact attempts", () => {
    expect(resolveFirstContactAttempt([])).toEqual({ state: "none" });
  });

  it("ignores other event types — an email open is not a human calling", () => {
    const rows = [
      { type: "email_open", occurred_at: "2026-09-20T10:00:00.000Z", created_at: null },
      { type: "click", occurred_at: "2026-09-21T10:00:00.000Z", created_at: null },
    ];
    expect(resolveFirstContactAttempt(rows)).toEqual({ state: "none" });
  });

  it("returns the earliest attempt, not the first row returned", () => {
    const rows = [
      { type: CONTACT_ATTEMPT_EVENT_TYPE, occurred_at: "2026-09-22T09:00:00.000Z", created_at: null },
      { type: CONTACT_ATTEMPT_EVENT_TYPE, occurred_at: "2026-09-20T08:15:00.000Z", created_at: null },
      { type: CONTACT_ATTEMPT_EVENT_TYPE, occurred_at: "2026-09-23T11:00:00.000Z", created_at: null },
    ];
    expect(resolveFirstContactAttempt(rows)).toEqual({
      state: "known",
      occurredAt: "2026-09-20T08:15:00.000Z",
    });
  });

  it("historical attempts without a time stay UNKNOWN and never borrow created_at", () => {
    // This is the whole point of the three-state answer. Rows written before
    // this change have a created_at, but that is when the row was inserted —
    // not when anyone picked up a phone. Counting it would manufacture C1.
    const rows = [
      { type: CONTACT_ATTEMPT_EVENT_TYPE, occurred_at: null, created_at: "2026-08-01T12:00:00.000Z" },
      { type: CONTACT_ATTEMPT_EVENT_TYPE, occurred_at: null, created_at: "2026-08-02T12:00:00.000Z" },
    ];
    expect(resolveFirstContactAttempt(rows)).toEqual({ state: "unknown", attempts: 2 });
  });

  it("unknown is distinct from none", () => {
    const unknown = resolveFirstContactAttempt([
      { type: CONTACT_ATTEMPT_EVENT_TYPE, occurred_at: null, created_at: "2026-08-01T12:00:00.000Z" },
    ]);
    expect(unknown.state).toBe("unknown");
    expect(resolveFirstContactAttempt([]).state).toBe("none");
  });

  it("an unparseable timestamp counts as missing, not as epoch zero", () => {
    const rows = [
      { type: CONTACT_ATTEMPT_EVENT_TYPE, occurred_at: "Práve vytvorený", created_at: null },
    ];
    expect(resolveFirstContactAttempt(rows)).toEqual({ state: "unknown", attempts: 1 });
  });

  it("is deterministic — same rows in any order give the same answer", () => {
    const rows = [
      { type: CONTACT_ATTEMPT_EVENT_TYPE, occurred_at: "2026-09-22T09:00:00.000Z", created_at: null },
      { type: CONTACT_ATTEMPT_EVENT_TYPE, occurred_at: null, created_at: "2026-09-01T09:00:00.000Z" },
      { type: CONTACT_ATTEMPT_EVENT_TYPE, occurred_at: "2026-09-20T08:15:00.000Z", created_at: null },
    ];
    const forward = resolveFirstContactAttempt(rows);
    const reversed = resolveFirstContactAttempt([...rows].reverse());
    expect(forward).toEqual(reversed);
    expect(forward).toEqual({ state: "known", occurredAt: "2026-09-20T08:15:00.000Z" });
  });
});

describe("recordContactAttempt", () => {
  it("stores the supplied occurrence time, the actor and the channel", async () => {
    let written: Record<string, unknown> | undefined;
    const client = stubClient({ capture: (row) => (written = row) });

    const result = await recordContactAttempt(client, validInput({ outcome: "unanswered" }), {
      resolveLeadAgency: leadInAgency,
    });

    expect(result.id).toBe("evt-1");
    expect(written).toMatchObject({
      agency_id: "agency-a",
      lead_id: "lead-1",
      type: CONTACT_ATTEMPT_EVENT_TYPE,
      occurred_at: "2026-09-24T07:30:00.000Z",
      actor_profile_id: "profile-1",
      channel: "call",
      outcome: "unanswered",
      source: "manual",
    });
  });

  it("refuses a lead that belongs to another agency", async () => {
    const client = stubClient();
    await expect(
      recordContactAttempt(client, validInput(), {
        resolveLeadAgency: async () => ({ found: true, agencyId: "agency-b" }),
      }),
    ).rejects.toThrow(/another agency/);
  });

  it("refuses a lead that does not exist", async () => {
    const client = stubClient();
    await expect(
      recordContactAttempt(client, validInput(), {
        resolveLeadAgency: async () => ({ found: false, agencyId: null }),
      }),
    ).rejects.toThrow(/does not exist/);
  });

  it("refuses an attempt with no actor — a draft nobody sent is not a contact", async () => {
    const client = stubClient();
    await expect(
      recordContactAttempt(client, validInput({ actorProfileId: "" }), {
        resolveLeadAgency: leadInAgency,
      }),
    ).rejects.toBeInstanceOf(ContactEventValidationError);
  });

  it("refuses a future timestamp beyond clock skew", async () => {
    const client = stubClient();
    await expect(
      recordContactAttempt(client, validInput(), {
        now: new Date("2026-09-24T07:00:00.000Z"),
        resolveLeadAgency: leadInAgency,
      }),
    ).rejects.toThrow(/future/);
  });

  it("tolerates small clock skew between browser and database", async () => {
    const client = stubClient();
    await expect(
      recordContactAttempt(client, validInput(), {
        now: new Date("2026-09-24T07:28:00.000Z"),
        resolveLeadAgency: leadInAgency,
      }),
    ).resolves.toMatchObject({ id: "evt-1" });
  });

  it("rejects an unknown channel rather than storing free text", async () => {
    const client = stubClient();
    await expect(
      recordContactAttempt(
        client,
        validInput({ channel: "pigeon" as unknown as RecordContactAttemptInput["channel"] }),
        { resolveLeadAgency: leadInAgency },
      ),
    ).rejects.toThrow(/unknown channel/);
  });
});

describe("getFirstContactAttemptAt", () => {
  it("reports UNKNOWN for a lead whose only attempts predate this substrate", async () => {
    const client = stubClient({
      rows: [{ type: CONTACT_ATTEMPT_EVENT_TYPE, occurred_at: null, created_at: "2026-07-01T00:00:00.000Z" }],
    });
    await expect(getFirstContactAttemptAt(client, "agency-a", "lead-1")).resolves.toEqual({
      state: "unknown",
      attempts: 1,
    });
  });

  it("reports NONE for a lead with no events at all", async () => {
    await expect(getFirstContactAttemptAt(stubClient({ rows: [] }), "agency-a", "lead-1")).resolves.toEqual({
      state: "none",
    });
  });
});
