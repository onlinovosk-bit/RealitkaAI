import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";
import { parseOutcomeParams, toSafeRow } from "@/lib/inbound/mail-outcome-reader";

const mockGetUser = vi.fn();
let profileAgency: string | null = "agency-a";
let table: Array<Record<string, unknown>> = [];
const adminCalls: Array<{ col: string; val: unknown }> = [];

function chain(rows: Array<Record<string, unknown>>) {
  let filtered = rows;
  let max = Infinity;
  const q: Record<string, unknown> = {
    select: () => q,
    eq: (col: string, val: unknown) => {
      adminCalls.push({ col, val });
      filtered = filtered.filter((r) => r[col] === val);
      return q;
    },
    gte: (col: string, val: string) => {
      filtered = filtered.filter((r) => String(r[col]) >= val);
      return q;
    },
    order: () => q,
    limit: (n: number) => {
      max = n;
      return q;
    },
    then: (res: (v: unknown) => unknown) =>
      res({ data: filtered.slice(0, max), error: null }),
  };
  return q;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: () => mockGetUser() },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: profileAgency ? { agency_id: profileAgency } : null,
            error: null,
          }),
        }),
      }),
    }),
  }),
  createAdminClient: () => ({ from: () => chain(table) }),
}));

const NOW = new Date().toISOString();
function row(agency: string, over: Record<string, unknown> = {}) {
  return {
    agency_id: agency,
    id: `id-${Math.random()}`,
    request_id: "req-SECRET",
    event_id: "evt-SECRET",
    created_at: NOW,
    outcome: "not_a_lead",
    reason: "no_contact",
    source: "nehnutelnosti",
    source_type: "portal",
    event_kind: "inquiry",
    source_detected_by: "domain",
    sender_domain: "nehnutelnosti.sk",
    parser_version: "v1",
    has_contact_email: false,
    has_contact_phone: false,
    has_listing_ref: true,
    has_message: true,
    mailbox_event: null,
    ...over,
  };
}

const req = (qs = "") => new Request(`http://localhost/api/inbound/outcomes${qs}`);

beforeEach(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  profileAgency = "agency-a";
  adminCalls.length = 0;
  table = [
    row("agency-a"),
    row("agency-a", { outcome: "lead_created", reason: null }),
    row("agency-a", { reason: "duplicate" }),
    row("agency-b", { sender_domain: "cudzia-agentura.sk", reason: "unknown_source" }),
  ];
});
afterEach(() => {
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  vi.clearAllMocks();
});

describe("WP-3 /api/inbound/outcomes", () => {
  it("(a) bez session -> 401 a žiadne dáta", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(JSON.stringify(await res.json())).not.toContain("nehnutelnosti");
    expect(adminCalls).toHaveLength(0);
  });

  it("(a) session bez agency_id -> 403, admin klient sa nevolá", async () => {
    profileAgency = null;
    const res = await GET(req());
    expect(res.status).toBe(403);
    expect(adminCalls).toHaveLength(0);
  });

  it("(a) bez service key -> 503, nie prázdny falošný výsledok", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect((await GET(req())).status).toBe(503);
  });

  it("(b) iná agentúra nevidí riadky; ?agency_id sa ignoruje", async () => {
    const res = await GET(req("?agency_id=agency-b"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totals.total).toBe(3);
    expect(JSON.stringify(body)).not.toContain("cudzia-agentura.sk");
    expect(body.recent.every((r: { sender_domain: string }) => r.sender_domain !== "cudzia-agentura.sk")).toBe(true);
    expect(adminCalls.every((c) => c.col !== "agency_id" || c.val === "agency-a")).toBe(true);
  });

  it("(b) agentúra B vidí len svoje", async () => {
    profileAgency = "agency-b";
    const body = await (await GET(req())).json();
    expect(body.totals.total).toBe(1);
    expect(body.recent[0].sender_domain).toBe("cudzia-agentura.sk");
  });

  it("agregát podľa outcome a reason", async () => {
    const body = await (await GET(req("?days=7"))).json();
    expect(body.totals.by_outcome).toEqual({ not_a_lead: 2, lead_created: 1 });
    expect(body.by_reason.find((x: { reason: string }) => x.reason === "duplicate").count).toBe(1);
  });

  it("(c) výstup neobsahuje e-mail, telo ani korelačné ID", async () => {
    table = [
      row("agency-a", {
        contact_email: "jan.novak@example.com",
        sender_email: "jan.novak@example.com",
        body: "Dobrý deň, mám záujem o byt",
        text: "tel +421900123456",
        from: "Ján Novák <jan.novak@example.com>",
      }),
    ];
    const text = JSON.stringify(await (await GET(req())).json());
    expect(text).not.toContain("@");
    expect(text).not.toContain("jan.novak");
    expect(text).not.toContain("Dobrý deň");
    expect(text).not.toContain("+421");
    expect(text).not.toContain("SECRET"); // request_id / event_id
    expect(text).not.toContain("agency-a");
    const keys = Object.keys(toSafeRow(table[0]));
    expect(keys).not.toEqual(expect.arrayContaining(["request_id"]));
    expect(keys).not.toEqual(expect.arrayContaining(["agency_id"]));
  });

  it("limit M <= 50 a validácia parametrov", async () => {
    table = Array.from({ length: 80 }, () => row("agency-a"));
    const ok = await (await GET(req("?limit=50"))).json();
    expect(ok.recent).toHaveLength(50);
    for (const bad of ["?limit=51", "?limit=0", "?limit=abc", "?days=0", "?days=91", "?days=-1", "?limit=1.5"]) {
      expect((await GET(req(bad))).status, bad).toBe(400);
    }
    expect(parseOutcomeParams(new URLSearchParams(""))).toEqual({ ok: true, days: 7, limit: 20 });
  });
});
