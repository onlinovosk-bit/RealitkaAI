import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  processAdvertPayload,
  processDeletePayload,
} from "@/lib/realvia/processQueue";
import type { RealviaWebhookPayload } from "@/lib/realvia/types";

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

const AGENCY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const AGENCY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SHARED_SOURCE_ID = "13303557";
const PROPERTY_A_ID = "prop-agency-a";

type EqCall = [string, unknown];

function makePropertiesClient(opts: {
  existing: { id: string; price: number | null; status: string } | null;
  insertId?: string;
}) {
  const selectEqs: EqCall[] = [];
  const mutateEqs: EqCall[] = [];
  let phase: "select" | "mutate" = "select";

  const selectBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn((col: string, val: unknown) => {
      selectEqs.push([col, val]);
      return selectBuilder;
    }),
    maybeSingle: vi.fn().mockResolvedValue({
      data: opts.existing,
      error: null,
    }),
  };

  const mutateBuilder = {
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn((col: string, val: unknown) => {
      mutateEqs.push([col, val]);
      return mutateBuilder;
    }),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { id: opts.insertId ?? "new-uuid" },
      error: null,
    }),
    // update() chain ends without single when we only call eq — resolve as thenable
    then: undefined as unknown,
  };

  // Supabase builders are not thenables by default; update().eq().eq() returns a promise-like.
  // Mirror PostgrestBuilder by making the final eq resolve.
  mutateBuilder.eq = vi.fn((col: string, val: unknown) => {
    mutateEqs.push([col, val]);
    const next = {
      ...mutateBuilder,
      eq: mutateBuilder.eq,
      then: (resolve: (v: unknown) => unknown) =>
        resolve({ data: null, error: null }),
    };
    return next;
  });

  const from = vi.fn((table: string) => {
    if (table === "realvia_price_history") {
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    phase = "select";
    return {
      select: (...args: unknown[]) => {
        phase = "select";
        return selectBuilder.select(...args);
      },
      update: (payload: unknown) => {
        phase = "mutate";
        return mutateBuilder.update(payload);
      },
      insert: (payload: unknown) => {
        phase = "mutate";
        return mutateBuilder.insert(payload);
      },
    };
  });

  return {
    client: { from },
    selectEqs,
    mutateEqs,
    mutateBuilder,
    selectBuilder,
    getPhase: () => phase,
  };
}

function sampleAdvert(overrides?: Partial<RealviaWebhookPayload["advert"]>): RealviaWebhookPayload {
  return {
    source_id: Number(SHARED_SOURCE_ID),
    advert: {
      source_id: Number(SHARED_SOURCE_ID),
      category: 11,
      transaction: 124,
      title: "Byt Poprad",
      description: "desc",
      price: 150000,
      currency: 1,
      ...overrides,
    },
    broker: {
      source_id: 1,
      first_name: "Jan",
      last_name: "Novak",
      email: "jan@example.com",
    },
  };
}

describe("Realvia processQueue agency scope", () => {
  beforeEach(() => {
    vi.mocked(createServiceRoleClient).mockReset();
  });

  it("looks up properties by agency_id + source_system + source_id (not source_id alone)", async () => {
    const stub = makePropertiesClient({
      existing: { id: PROPERTY_A_ID, price: 140000, status: "active" },
    });
    vi.mocked(createServiceRoleClient).mockReturnValue(
      stub.client as unknown as ReturnType<typeof createServiceRoleClient>,
    );

    const result = await processAdvertPayload(sampleAdvert({ price: 155000 }), AGENCY_A);

    expect(result.success).toBe(true);
    expect(result.action).toBe("updated");
    expect(stub.selectEqs).toEqual(
      expect.arrayContaining([
        ["agency_id", AGENCY_A],
        ["source_system", "realvia"],
        ["source_id", SHARED_SOURCE_ID],
      ]),
    );
    expect(stub.selectEqs.map(([c]) => c)).not.toEqual(["source_id"]);
    expect(stub.mutateEqs).toEqual(
      expect.arrayContaining([
        ["id", PROPERTY_A_ID],
        ["agency_id", AGENCY_A],
      ]),
    );
  });

  it("does not update another agency row when shared source_id exists elsewhere", async () => {
    // Agency B lookup finds nothing (tenant-scoped) → create path, no mutate on PROPERTY_A_ID
    const stub = makePropertiesClient({
      existing: null,
      insertId: "prop-agency-b",
    });
    vi.mocked(createServiceRoleClient).mockReturnValue(
      stub.client as unknown as ReturnType<typeof createServiceRoleClient>,
    );

    const insertPayloads: unknown[] = [];
    const originalFrom = stub.client.from;
    stub.client.from = vi.fn((table: string) => {
      const builder = originalFrom(table);
      if (table === "properties") {
        const origInsert = builder.insert;
        builder.insert = (payload: unknown) => {
          insertPayloads.push(payload);
          return origInsert(payload);
        };
      }
      return builder;
    });

    const result = await processAdvertPayload(sampleAdvert(), AGENCY_B);

    expect(result.success).toBe(true);
    expect(result.action).toBe("created");
    expect(result.propertyId).toBe("prop-agency-b");
    expect(stub.selectEqs).toEqual(
      expect.arrayContaining([
        ["agency_id", AGENCY_B],
        ["source_id", SHARED_SOURCE_ID],
      ]),
    );
    expect(insertPayloads[0]).toEqual(
      expect.objectContaining({
        agency_id: AGENCY_B,
        source_id: SHARED_SOURCE_ID,
        source_system: "realvia",
      }),
    );
    // Must not force PK = source_id (collides across tenants).
    expect(insertPayloads[0]).not.toHaveProperty("id");
    expect(stub.mutateEqs.find(([c, v]) => c === "id" && v === PROPERTY_A_ID)).toBeUndefined();
  });

  it("delete soft-status only within the calling agency", async () => {
    const stub = makePropertiesClient({
      existing: { id: PROPERTY_A_ID, price: null, status: "active" },
    });
    vi.mocked(createServiceRoleClient).mockReturnValue(
      stub.client as unknown as ReturnType<typeof createServiceRoleClient>,
    );

    const result = await processDeletePayload(SHARED_SOURCE_ID, AGENCY_A, "sold");

    expect(result.success).toBe(true);
    expect(result.action).toBe("deleted");
    expect(stub.selectEqs).toEqual(
      expect.arrayContaining([
        ["agency_id", AGENCY_A],
        ["source_system", "realvia"],
        ["source_id", SHARED_SOURCE_ID],
      ]),
    );
    expect(stub.mutateEqs).toEqual(
      expect.arrayContaining([
        ["id", PROPERTY_A_ID],
        ["agency_id", AGENCY_A],
      ]),
    );
  });

  it("refuses advert processing without agency_id", async () => {
    const result = await processAdvertPayload(sampleAdvert(), "  ");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Agency resolution failed/i);
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });
});
