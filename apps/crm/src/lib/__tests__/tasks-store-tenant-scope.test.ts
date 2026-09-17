import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const resolveTenantSupabaseMock = vi.fn();
const resolveSessionAgencyIdMock = vi.fn();

vi.mock("@/lib/supabase/resolve-client", () => ({
  resolveTenantSupabase: (...args: unknown[]) => resolveTenantSupabaseMock(...args),
}));

vi.mock("@/lib/tenant-scope", () => ({
  resolveSessionAgencyId: (...args: unknown[]) => resolveSessionAgencyIdMock(...args),
  filterRowsByAgency: <T extends { agency_id?: string | null }>(
    rows: T[],
    agencyId: string | null,
  ) => (agencyId ? rows.filter((row) => row.agency_id === agencyId) : []),
}));

const AGENCY_A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";

type Call = { table: string; op: string; args: unknown[] };

/**
 * Minimálny Supabase double. `leads` vracia lead-y agentúry, `tasks` vracia
 * `tasksRows` — ale IBA tie, ktoré prešli `.in("lead_id", …)`, presne ako DB.
 */
function makeClient(options: {
  leadRows?: Array<{ id: string }>;
  leadError?: { message: string } | null;
  taskRows?: Array<Record<string, unknown>>;
  taskError?: { message: string } | null;
}) {
  const calls: Call[] = [];

  function leadsBuilder() {
    return {
      select: (...a: unknown[]) => {
        calls.push({ table: "leads", op: "select", args: a });
        return {
          eq: (...a2: unknown[]) => {
            calls.push({ table: "leads", op: "eq", args: a2 });
            return Promise.resolve({
              data: options.leadError ? null : (options.leadRows ?? []),
              error: options.leadError ?? null,
            });
          },
        };
      },
    };
  }

  function tasksBuilder() {
    let allowed: string[] | null = null;
    const builder = {
      select: (...a: unknown[]) => {
        calls.push({ table: "tasks", op: "select", args: a });
        return builder;
      },
      in: (...a: unknown[]) => {
        calls.push({ table: "tasks", op: "in", args: a });
        allowed = a[1] as string[];
        return builder;
      },
      order: (...a: unknown[]) => {
        calls.push({ table: "tasks", op: "order", args: a });
        const rows = options.taskRows ?? [];
        const filtered = allowed
          ? rows.filter((row) => allowed!.includes(String(row.lead_id)))
          : rows;
        return Promise.resolve({
          data: options.taskError ? null : filtered,
          error: options.taskError ?? null,
        });
      },
    };
    return builder;
  }

  return {
    calls,
    client: {
      from: (table: string) => (table === "leads" ? leadsBuilder() : tasksBuilder()),
    },
  };
}

describe("listTasks — tenant scoping (fail-closed)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("filtruje tasks na lead-y vlastnej agentúry (DB-level .in + app-level filter)", async () => {
    resolveSessionAgencyIdMock.mockResolvedValue(AGENCY_A);
    const { client, calls } = makeClient({
      leadRows: [{ id: "lead-a1" }, { id: "lead-a2" }],
      taskRows: [
        { id: "t-own", lead_id: "lead-a1", title: "Moja úloha", created_at: "2026-01-02" },
        { id: "t-foreign", lead_id: "lead-b9", title: "Cudzia úloha", created_at: "2026-01-01" },
      ],
    });
    resolveTenantSupabaseMock.mockResolvedValue(client);

    const { listTasks } = await import("@/lib/tasks-store");
    const tasks = await listTasks(client as never);

    expect(tasks.map((t) => t.id)).toEqual(["t-own"]);

    // agency_id sa musí použiť pri lookupe lead-ov
    expect(calls).toContainEqual({ table: "leads", op: "eq", args: ["agency_id", AGENCY_A] });
    // a tasks query musí byť scoped cez lead_id, nie neobmedzený select
    const inCall = calls.find((c) => c.table === "tasks" && c.op === "in");
    expect(inCall).toBeDefined();
    expect(inCall!.args[0]).toBe("lead_id");
    expect(inCall!.args[1]).toEqual(["lead-a1", "lead-a2"]);
  });

  it("negatívny test: nevracia úlohy cudzej agentúry ani keď ich DB vráti", async () => {
    resolveSessionAgencyIdMock.mockResolvedValue(AGENCY_A);

    // Klient, ktorý `.in("lead_id", …)` ignoruje — simuluje obídenie/zlyhanie RLS
    // aj DB-level filtra. App vrstva musí cudziu úlohu zahodiť sama.
    const leakyClient = {
      from: (table: string) => {
        if (table === "leads") {
          return {
            select: () => ({
              eq: async () => ({ data: [{ id: "lead-a1" }], error: null }),
            }),
          };
        }
        const builder: Record<string, unknown> = {};
        builder.select = () => builder;
        builder.in = () => builder;
        builder.order = async () => ({
          data: [{ id: "t-foreign", lead_id: "lead-b9", created_at: "2026-01-01" }],
          error: null,
        });
        return builder;
      },
    };
    resolveTenantSupabaseMock.mockResolvedValue(leakyClient);

    const { listTasks } = await import("@/lib/tasks-store");
    await expect(listTasks(leakyClient as never)).resolves.toEqual([]);
  });

  it("fail-closed: chýbajúce agency_id → prázdny zoznam (nie demo dáta)", async () => {
    resolveSessionAgencyIdMock.mockResolvedValue(null);
    const { client } = makeClient({ leadRows: [{ id: "lead-a1" }] });
    resolveTenantSupabaseMock.mockResolvedValue(client);

    const { listTasks } = await import("@/lib/tasks-store");
    await expect(listTasks(client as never)).resolves.toEqual([]);
  });

  it("fail-closed: chyba DB na tasks → prázdny zoznam (nie demoTasks)", async () => {
    resolveSessionAgencyIdMock.mockResolvedValue(AGENCY_A);
    const { client } = makeClient({
      leadRows: [{ id: "lead-a1" }],
      taskError: { message: "boom" },
    });
    resolveTenantSupabaseMock.mockResolvedValue(client);

    const { listTasks } = await import("@/lib/tasks-store");
    const tasks = await listTasks(client as never);

    expect(tasks).toEqual([]);
    expect(tasks.some((t) => t.title === "Kontaktovať horúce leady")).toBe(false);
  });

  it("fail-closed: chyba DB na leads → prázdny zoznam", async () => {
    resolveSessionAgencyIdMock.mockResolvedValue(AGENCY_A);
    const { client } = makeClient({ leadError: { message: "leads down" } });
    resolveTenantSupabaseMock.mockResolvedValue(client);

    const { listTasks } = await import("@/lib/tasks-store");
    await expect(listTasks(client as never)).resolves.toEqual([]);
  });

  it("fail-closed: bez tenant klienta v produkcii nevracia demo úlohy", async () => {
    vi.stubEnv("NODE_ENV", "production");
    resolveTenantSupabaseMock.mockResolvedValue(null);

    const { listTasks } = await import("@/lib/tasks-store");
    await expect(listTasks()).resolves.toEqual([]);
  });
});
