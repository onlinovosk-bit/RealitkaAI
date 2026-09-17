import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveTenantSupabaseMock = vi.fn();

vi.mock("@/lib/supabase/resolve-client", () => ({
  resolveTenantSupabase: (...args: unknown[]) => resolveTenantSupabaseMock(...args),
}));

const AGENCY = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const PROFILE = "pppppppp-1111-4111-8111-pppppppppppp";

type Row = Record<string, any>;

/**
 * In-memory `scheduled_events` double. Podporuje .eq/.in/.lt/.gt/.limit
 * a insert — dosť na to, aby dedup a free/busy logika bežala reálne.
 */
function makeDb(seed: Row[] = []) {
  const rows: Row[] = [...seed];
  const inserts: Row[] = [];

  function query() {
    const preds: Array<(row: Row) => boolean> = [];
    let limit = Infinity;

    const chain: any = {
      select: () => chain,
      eq: (column: string, value: unknown) => {
        if (column.startsWith("meta->>")) {
          const key = column.slice("meta->>".length);
          preds.push((row) => (row.meta ?? {})[key] === value);
        } else {
          preds.push((row) => row[column] === value);
        }
        return chain;
      },
      in: (column: string, values: unknown[]) => {
        preds.push((row) => values.includes(row[column]));
        return chain;
      },
      lt: (column: string, value: string) => {
        preds.push((row) => Date.parse(row[column]) < Date.parse(value));
        return chain;
      },
      gt: (column: string, value: string) => {
        preds.push((row) => Date.parse(row[column]) > Date.parse(value));
        return chain;
      },
      limit: (n: number) => {
        limit = n;
        return chain;
      },
      then: (onOk: (r: unknown) => unknown) => {
        const data = rows.filter((row) => preds.every((p) => p(row))).slice(0, limit);
        return Promise.resolve({ data, error: null }).then(onOk);
      },
    };
    return chain;
  }

  const client = {
    from: () => ({
      select: () => query(),
      insert: (payload: Row) => {
        const row: Row = {
          id: `evt-${rows.length + 1}`,
          created_at: "2026-09-01T00:00:00.000Z",
          ...payload,
        };
        inserts.push(row);
        rows.push(row);
        return {
          select: () => ({
            single: async () => ({ data: row, error: null }),
          }),
        };
      },
    }),
  };

  return { client, rows, inserts };
}

const baseInput = {
  title: "Obhliadka Poprad",
  startsAt: "2026-10-01T09:00:00.000Z",
  endsAt: "2026-10-01T10:00:00.000Z",
  leadId: "lead-1",
  eventType: "viewing" as const,
};

describe("scheduled-events — idempotencia a free/busy (SMO-B09)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("opakovaný request nevytvorí druhý event (dedup na agency+lead+slot)", async () => {
    const { client, inserts } = makeDb();
    resolveTenantSupabaseMock.mockResolvedValue(client);

    const { createScheduledEvent } = await import("@/lib/scheduled-events/store");

    const first = await createScheduledEvent(AGENCY, PROFILE, baseInput, client as never);
    expect(first.deduplicated).toBe(false);

    const second = await createScheduledEvent(AGENCY, PROFILE, baseInput, client as never);
    expect(second.deduplicated).toBe(true);
    expect(second.event.id).toBe(first.event.id);

    expect(inserts).toHaveLength(1);
  });

  it("explicitný idempotency key v meta má prednosť pred odvodeným", async () => {
    const { client, inserts } = makeDb();
    resolveTenantSupabaseMock.mockResolvedValue(client);

    const { createScheduledEvent } = await import("@/lib/scheduled-events/store");

    const withKey = { ...baseInput, meta: { idempotency_key: "req-42" } };
    const first = await createScheduledEvent(AGENCY, PROFILE, withKey, client as never);

    // Iný slot, ale rovnaký kľúč → stále ten istý event.
    const second = await createScheduledEvent(
      AGENCY,
      PROFILE,
      {
        ...withKey,
        startsAt: "2026-10-02T09:00:00.000Z",
        endsAt: "2026-10-02T10:00:00.000Z",
      },
      client as never,
    );

    expect(second.deduplicated).toBe(true);
    expect(second.event.id).toBe(first.event.id);
    expect(inserts).toHaveLength(1);
  });

  it("dedup NEprekročí hranicu agentúry (cudzia agentúra vytvorí vlastný event)", async () => {
    const { client, inserts } = makeDb();
    resolveTenantSupabaseMock.mockResolvedValue(client);

    const { createScheduledEvent } = await import("@/lib/scheduled-events/store");

    // Rovnaký explicitný kľúč pre obe agentúry — jediné, čo ich delí, je agency scope.
    const shared = { ...baseInput, meta: { idempotency_key: "req-shared" } };

    await createScheduledEvent(AGENCY, PROFILE, shared, client as never);
    const other = await createScheduledEvent(
      "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
      "qqqqqqqq-2222-4222-8222-qqqqqqqqqqqq",
      shared,
      client as never,
    );

    expect(other.deduplicated).toBe(false);
    expect(inserts).toHaveLength(2);
  });

  it("free/busy konflikt sa odmietne (prekrývajúci termín toho istého makléra)", async () => {
    const { client, inserts } = makeDb();
    resolveTenantSupabaseMock.mockResolvedValue(client);

    const { createScheduledEvent, ScheduledEventConflictError } = await import(
      "@/lib/scheduled-events/store"
    );

    await createScheduledEvent(AGENCY, PROFILE, baseInput, client as never);

    const overlapping = {
      ...baseInput,
      leadId: "lead-2",
      startsAt: "2026-10-01T09:30:00.000Z",
      endsAt: "2026-10-01T10:30:00.000Z",
    };

    await expect(
      createScheduledEvent(AGENCY, PROFILE, overlapping, client as never),
    ).rejects.toBeInstanceOf(ScheduledEventConflictError);

    // Konflikt NESMIE nič uložiť — inak by sa poslalo falošné potvrdenie.
    expect(inserts).toHaveLength(1);
  });

  it("nadväzujúci termín (end == start) konflikt NIE je", async () => {
    const { client, inserts } = makeDb();
    resolveTenantSupabaseMock.mockResolvedValue(client);

    const { createScheduledEvent } = await import("@/lib/scheduled-events/store");

    await createScheduledEvent(AGENCY, PROFILE, baseInput, client as never);
    await createScheduledEvent(
      AGENCY,
      PROFILE,
      {
        ...baseInput,
        leadId: "lead-2",
        startsAt: "2026-10-01T10:00:00.000Z",
        endsAt: "2026-10-01T11:00:00.000Z",
      },
      client as never,
    );

    expect(inserts).toHaveLength(2);
  });

  it("zrušená udalosť neblokuje slot", async () => {
    const { client, inserts } = makeDb([
      {
        id: "evt-cancelled",
        agency_id: AGENCY,
        profile_id: PROFILE,
        lead_id: "lead-9",
        property_id: null,
        event_type: "viewing",
        status: "cancelled",
        title: "Zrušená",
        description: "",
        location: "",
        starts_at: baseInput.startsAt,
        ends_at: baseInput.endsAt,
        timezone: "Europe/Bratislava",
        google_calendar_event_id: null,
        google_calendar_html_link: null,
        reminder_minutes: null,
        meta: {},
        cancelled_at: "2026-09-01T00:00:00.000Z",
        created_at: "2026-09-01T00:00:00.000Z",
        updated_at: "2026-09-01T00:00:00.000Z",
      },
    ]);
    resolveTenantSupabaseMock.mockResolvedValue(client);

    const { createScheduledEvent } = await import("@/lib/scheduled-events/store");
    const created = await createScheduledEvent(AGENCY, PROFILE, baseInput, client as never);

    expect(created.deduplicated).toBe(false);
    expect(inserts).toHaveLength(1);
  });

  it("idempotency key sa uloží do meta (bez novej DB schémy)", async () => {
    const { client, inserts } = makeDb();
    resolveTenantSupabaseMock.mockResolvedValue(client);

    const { createScheduledEvent, SCHEDULED_EVENT_IDEMPOTENCY_META_KEY } = await import(
      "@/lib/scheduled-events/store"
    );

    const result = await createScheduledEvent(AGENCY, PROFILE, baseInput, client as never);

    expect(inserts[0].meta[SCHEDULED_EVENT_IDEMPOTENCY_META_KEY]).toBe(
      result.idempotencyKey,
    );
    expect(result.idempotencyKey).toContain(AGENCY);
  });
});
