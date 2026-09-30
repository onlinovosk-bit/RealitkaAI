import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { processAdvertPayload } from "@/lib/realvia/processQueue";
import type { RealviaWebhookPayload } from "@/lib/realvia/types";

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

/**
 * PROD incident (2026-09-11 →): PR #522 prestal posielať `id` pri vytvorení ponuky
 * s predpokladom „DB generates id". `properties.id` je však v PROD `text NOT NULL`
 * BEZ defaultu, takže každé vytvorenie novej ponuky zlyhalo:
 *   null value in column "id" of relation "properties" violates not-null constraint
 * (31 webhookov, 17 ponúk). Aktualizácie existujúcich ponúk prechádzali, preto to
 * nikto nezbadal — a predošlý test dokonca kódoval chybu (`not.toHaveProperty("id")`).
 *
 * Tento súbor používa DB dvojník, ktorý vynucuje PROD obmedzenie. Bez neho by test
 * prešiel aj na pokazenom kóde.
 */

const AGENCY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const AGENCY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SOURCE_ID = "13303557";
const NOT_NULL_ERROR = 'null value in column "id" of relation "properties" violates not-null constraint';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** properties.id: text NOT NULL, bez defaultu — presne ako v PROD. */
function prodLikeDb(opts: { existing?: { id: string; price: number | null; status: string } | null } = {}) {
  const inserts: Record<string, unknown>[] = [];
  const updates: Record<string, unknown>[] = [];

  const propertiesInsert = (row: Record<string, unknown>) => {
    inserts.push(row);
    return {
      select: () => ({
        single: async () => {
          const id = row.id;
          if (id === undefined || id === null || id === "") {
            return { data: null, error: { message: NOT_NULL_ERROR } };
          }
          return { data: { id }, error: null };
        },
      }),
    };
  };

  const from = vi.fn((table: string) => {
    if (table === "realvia_price_history") {
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    }
    return {
      select: () => {
        const b: Record<string, unknown> = {};
        b.eq = () => b;
        b.maybeSingle = async () => ({ data: opts.existing ?? null, error: null });
        return b;
      },
      insert: propertiesInsert,
      update: (row: Record<string, unknown>) => {
        updates.push(row);
        const b: Record<string, unknown> = {};
        b.eq = () => b;
        b.then = (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null });
        return b;
      },
    };
  });

  return { client: { from }, inserts, updates };
}

function advert(): RealviaWebhookPayload {
  return {
    advert: {
      source_id: Number(SOURCE_ID),
      category: 11,
      transaction: 124,
      title: "Byt Poprad",
      description: "desc",
      price: 150000,
      currency: 1,
    },
    broker: { source_id: 1, first_name: "Jan", last_name: "Novak", email: "jan@example.com" },
  };
}

function use(db: ReturnType<typeof prodLikeDb>) {
  vi.mocked(createServiceRoleClient).mockReturnValue(
    db.client as unknown as ReturnType<typeof createServiceRoleClient>,
  );
}

describe("DB dvojník vynucuje PROD obmedzenie (inak by testy nič nedokazovali)", () => {
  it("insert bez `id` zlyhá presne tou chybou, ktorú videla produkcia", async () => {
    const db = prodLikeDb();
    const res = await db.client.from("properties").insert({ title: "x" }).select("id").single();
    expect(res.error?.message).toBe(NOT_NULL_ERROR);
  });
});

describe("Realvia: vytvorenie novej ponuky", () => {
  beforeEach(() => {
    vi.mocked(createServiceRoleClient).mockReset();
  });

  it("uspeje na DB bez defaultu pre `id` — regresia z 2026-09-11", async () => {
    const db = prodLikeDb({ existing: null });
    use(db);

    const result = await processAdvertPayload(advert(), AGENCY_A);

    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
    expect(result.action).toBe("created");
  });

  it("pošle neprázdne `id` vo formáte UUID v4", async () => {
    const db = prodLikeDb({ existing: null });
    use(db);

    await processAdvertPayload(advert(), AGENCY_A);

    const id = db.inserts[0].id;
    expect(typeof id).toBe("string");
    expect(id).toMatch(UUID_V4);
  });

  it("`id` nie je Realvia source_id (kolízia medzi tenantmi — dôvod PR #522)", async () => {
    const db = prodLikeDb({ existing: null });
    use(db);

    await processAdvertPayload(advert(), AGENCY_A);

    expect(db.inserts[0].id).not.toBe(SOURCE_ID);
    expect(db.inserts[0].source_id).toBe(SOURCE_ID);
  });

  it("rovnaké source_id v dvoch agentúrach dá dve rôzne `id`", async () => {
    const a = prodLikeDb({ existing: null });
    use(a);
    await processAdvertPayload(advert(), AGENCY_A);

    const b = prodLikeDb({ existing: null });
    use(b);
    await processAdvertPayload(advert(), AGENCY_B);

    expect(a.inserts[0].id).not.toBe(b.inserts[0].id);
  });

  it("vrátené propertyId je to, ktoré sa uložilo", async () => {
    const db = prodLikeDb({ existing: null });
    use(db);

    const result = await processAdvertPayload(advert(), AGENCY_A);

    expect(result.propertyId).toBe(db.inserts[0].id);
  });
});

describe("Realvia: aktualizácia existujúcej ponuky ostáva nezmenená", () => {
  beforeEach(() => {
    vi.mocked(createServiceRoleClient).mockReset();
  });

  it("neposiela `id` a ponecháva existujúce", async () => {
    const db = prodLikeDb({ existing: { id: "prop-existing", price: 140000, status: "active" } });
    use(db);

    const result = await processAdvertPayload(advert(), AGENCY_A);

    expect(result.success).toBe(true);
    expect(result.action).toBe("updated");
    expect(result.propertyId).toBe("prop-existing");
    expect(db.updates[0]).not.toHaveProperty("id");
    expect(db.inserts).toHaveLength(0);
  });
});
