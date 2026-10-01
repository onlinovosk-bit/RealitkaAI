import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

type AccountRow = {
  id: string;
  agency_id: string;
  provider: string;
  customer_id: string;
  manager_customer_id: string;
  status: string;
  credential_type: string;
  billing_owner: string;
  created_at: string;
  connected_at: string | null;
  last_sync_at: string | null;
  credential_ref?: string;
};

const ACCOUNT_A: AccountRow = {
  id: "acct-a",
  agency_id: "agency-a",
  provider: "GOOGLE",
  customer_id: "1112223333",
  manager_customer_id: "1112223333",
  status: "PENDING",
  credential_type: "SERVICE_ACCOUNT",
  billing_owner: "CLIENT",
  created_at: "2026-08-12T00:00:00.000Z",
  connected_at: null,
  last_sync_at: null,
  credential_ref: "env:GOOGLE_ADS_SA_KEY_JSON",
};

const ACCOUNT_B: AccountRow = {
  id: "acct-b",
  agency_id: "agency-b",
  provider: "GOOGLE",
  customer_id: "4445556666",
  manager_customer_id: "4445556666",
  status: "PENDING",
  credential_type: "SERVICE_ACCOUNT",
  billing_owner: "CLIENT",
  created_at: "2026-08-12T00:00:00.000Z",
  connected_at: null,
  last_sync_at: null,
  credential_ref: "env:GOOGLE_ADS_SA_KEY_JSON",
};

function makeAccountsQuery(allRows: AccountRow[]) {
  const filters: Array<{ col: string; val: string }> = [];
  const api = {
    select: () => api,
    eq: (col: string, val: string) => {
      filters.push({ col, val });
      return api;
    },
    order: async () => {
      const rows = allRows.filter((row) =>
        filters.every((f) => (row as Record<string, string>)[f.col] === f.val),
      );
      return { data: rows, error: null };
    },
  };
  return api;
}

describe("GET /api/acquisition/google/accounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("lists only the caller tenant accounts (cross-tenant A cannot see B)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-a" } },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { agency_id: "agency-a" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "acquisition_accounts") {
        return makeAccountsQuery([ACCOUNT_A, ACCOUNT_B]);
      }
      throw new Error(`unexpected table ${table}`);
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.accounts).toHaveLength(1);
    expect(body.accounts[0].id).toBe("acct-a");
    expect(body.accounts[0].agency_id).toBe("agency-a");
    expect(body.accounts.map((a: AccountRow) => a.agency_id)).not.toContain("agency-b");
    expect(JSON.stringify(body)).not.toContain("credential_ref");
    expect(JSON.stringify(body)).not.toContain("BEGIN PRIVATE KEY");
  });

  it("tenant B only sees B accounts", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-b" } },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { agency_id: "agency-b" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "acquisition_accounts") {
        return makeAccountsQuery([ACCOUNT_A, ACCOUNT_B]);
      }
      throw new Error(`unexpected table ${table}`);
    });

    const res = await GET();
    const body = await res.json();
    expect(body.accounts).toHaveLength(1);
    expect(body.accounts[0].agency_id).toBe("agency-b");
  });
});