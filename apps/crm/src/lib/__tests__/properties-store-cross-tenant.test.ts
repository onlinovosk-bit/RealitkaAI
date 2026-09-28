import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveTenantSupabaseMock = vi.fn();
const resolveSessionAgencyIdMock = vi.fn();

vi.mock("@/lib/supabase/resolve-client", () => ({
  resolveTenantSupabase: (...args: unknown[]) => resolveTenantSupabaseMock(...args),
}));

vi.mock("@/lib/demo-mode-cookie", () => ({
  readDemoModeFromCookie: async () => false,
}));

vi.mock("@/lib/tenant-scope", () => ({
  resolveSessionAgencyId: (...args: unknown[]) => resolveSessionAgencyIdMock(...args),
  filterRowsByAgency: <T extends { agency_id?: string | null }>(
    rows: T[],
    agencyId: string | null,
  ) => (agencyId ? rows.filter((row) => row.agency_id === agencyId) : []),
}));

const AGENCY_A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const AGENCY_B = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";

const FOREIGN_ROW = {
  id: "prop-b",
  agency_id: AGENCY_B,
  title: "Cudzia nehnuteľnosť",
  location: "Košice",
  price: 100000,
  type: "Byt",
  rooms: "2 izby",
  features: [],
  status: "Aktívna",
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

type EqCall = [string, unknown];

/**
 * Supabase double, ktorý sa správa ako DB: `.eq()` filtre sa reálne aplikujú
 * na jediný uložený riadok (`FOREIGN_ROW`, patriaci agentúre B).
 */
function makeDb(row: Record<string, unknown> | null = FOREIGN_ROW) {
  const eqCalls: Record<string, EqCall[]> = { select: [], update: [], delete: [] };

  function builder(op: "select" | "update" | "delete") {
    const filters: EqCall[] = [];
    const chain: Record<string, unknown> = {};
    chain.eq = (column: string, value: unknown) => {
      filters.push([column, value]);
      eqCalls[op].push([column, value]);
      return chain;
    };
    const resolve = () => {
      const match =
        row && filters.every(([column, value]) => row[column] === value) ? row : null;
      return match
        ? { data: match, error: null }
        : { data: null, error: { message: "no rows" } };
    };
    chain.select = () => chain;
    chain.single = async () => resolve();
    chain.maybeSingle = async () => resolve();
    chain.then = (onOk: (r: unknown) => unknown) => {
      const r = resolve();
      // delete vracia iba { error }
      return Promise.resolve(
        op === "delete" ? { error: r.data ? null : null } : r,
      ).then(onOk);
    };
    return chain;
  }

  return {
    eqCalls,
    client: {
      from: () => ({
        select: () => builder("select"),
        update: () => builder("update"),
        delete: () => builder("delete"),
      }),
    },
  };
}

describe("properties-store — cross-tenant negatívny kontrakt (SMO-B04)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    resolveSessionAgencyIdMock.mockResolvedValue(AGENCY_A);
  });

  it("getProperty NEPREČÍTA cudziu property (lookup scoped na agency_id)", async () => {
    const { client, eqCalls } = makeDb();
    resolveTenantSupabaseMock.mockResolvedValue(client);

    const { getProperty } = await import("@/lib/properties-store");
    await expect(getProperty("prop-b", client as never)).resolves.toBeUndefined();

    expect(eqCalls.select).toContainEqual(["agency_id", AGENCY_A]);
    expect(eqCalls.select).toContainEqual(["id", "prop-b"]);
  });

  it("getProperty PREČÍTA vlastnú property (dôkaz, že test nie je vacuous)", async () => {
    const own = { ...FOREIGN_ROW, id: "prop-a", agency_id: AGENCY_A };
    const { client } = makeDb(own);
    resolveTenantSupabaseMock.mockResolvedValue(client);

    const { getProperty } = await import("@/lib/properties-store");
    await expect(getProperty("prop-a", client as never)).resolves.toMatchObject({
      id: "prop-a",
      agencyId: AGENCY_A,
    });
  });

  it("updateProperty NEZMENÍ cudziu property — update je scoped na agency_id", async () => {
    const { client, eqCalls } = makeDb();
    resolveTenantSupabaseMock.mockResolvedValue(client);

    const { updateProperty } = await import("@/lib/properties-store");
    await expect(
      updateProperty("prop-b", { title: "Hacked" }, client as never),
    ).rejects.toThrow();

    expect(eqCalls.update).toContainEqual(["agency_id", AGENCY_A]);
  });

  it("deleteProperty NEZMAŽE cudziu property — delete je scoped na agency_id", async () => {
    const { client, eqCalls } = makeDb();
    resolveTenantSupabaseMock.mockResolvedValue(client);

    const { deleteProperty } = await import("@/lib/properties-store");
    await deleteProperty("prop-b", client as never);

    expect(eqCalls.delete).toContainEqual(["agency_id", AGENCY_A]);
    expect(eqCalls.delete).toContainEqual(["id", "prop-b"]);
  });

  it("fail-closed: bez agency_id sa update ani delete nespustí", async () => {
    resolveSessionAgencyIdMock.mockResolvedValue(null);
    const { client, eqCalls } = makeDb();
    resolveTenantSupabaseMock.mockResolvedValue(client);

    const { updateProperty, deleteProperty } = await import("@/lib/properties-store");

    await expect(
      updateProperty("prop-b", { title: "Hacked" }, client as never),
    ).rejects.toThrow("Chýba tenant profil pre nehnuteľnosti.");
    await expect(deleteProperty("prop-b", client as never)).rejects.toThrow(
      "Chýba tenant profil pre nehnuteľnosti.",
    );

    expect(eqCalls.update).toEqual([]);
    expect(eqCalls.delete).toEqual([]);
  });

  it("listProperties je fail-closed bez agency_id", async () => {
    resolveSessionAgencyIdMock.mockResolvedValue(null);
    const { client } = makeDb();
    resolveTenantSupabaseMock.mockResolvedValue(client);

    const { listProperties } = await import("@/lib/properties-store");
    await expect(listProperties(undefined, client as never)).resolves.toEqual([]);
  });
});
