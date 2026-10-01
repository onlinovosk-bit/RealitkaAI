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
  manager_customer_id: string | null;
  status: string;
  credential_type: string;
  billing_owner: string;
  created_at: string;
  connected_at: string | null;
  last_sync_at: string | null;
  credential_ref?: string;
};

type CampaignRow = {
  id: string;
  agency_id: string;
  acquisition_account_id: string;
  provider: string;
  provider_campaign_id: string;
  name: string;
  status: string;
  objective: string | null;
  daily_budget: number | null;
  currency: string | null;
  bidding_strategy: string | null;
  last_synced_at: string;
  created_at: string;
};

type EventRow = {
  id: string;
  agency_id: string;
  provider: string;
  event_type: string;
  provider_event_id: string;
  lead_id: string | null;
  processing_status: string;
  received_at: string;
  metadata?: { secret?: string };
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
  ...ACCOUNT_A,
  id: "acct-b",
  agency_id: "agency-b",
  customer_id: "4445556666",
  manager_customer_id: "4445556666",
};

const CAMPAIGN_A: CampaignRow = {
  id: "camp-a",
  agency_id: "agency-a",
  acquisition_account_id: "acct-a",
  provider: "GOOGLE",
  provider_campaign_id: "24134657673",
  name: "RKA-test-byty",
  status: "PAUSED",
  objective: null,
  daily_budget: null,
  currency: "EUR",
  bidding_strategy: null,
  last_synced_at: "2026-08-15T12:00:00.000Z",
  created_at: "2026-08-15T12:00:00.000Z",
};

const CAMPAIGN_B: CampaignRow = {
  ...CAMPAIGN_A,
  id: "camp-b",
  agency_id: "agency-b",
  acquisition_account_id: "acct-b",
  provider_campaign_id: "24134894838",
  name: "RKB-test-domy",
};

const EVENT_A: EventRow = {
  id: "evt-a",
  agency_id: "agency-a",
  provider: "GOOGLE",
  event_type: "lead.form_submitted",
  provider_event_id: "stage0-prod-1",
  lead_id: null,
  processing_status: "LOGGED_TEST",
  received_at: "2026-08-15T16:38:02.000Z",
  metadata: { secret: "BEGIN PRIVATE KEY" },
};

const EVENT_B: EventRow = {
  ...EVENT_A,
  id: "evt-b",
  agency_id: "agency-b",
  provider_event_id: "stage0-other",
};

function makeListQuery(allRows: Array<Record<string, unknown>>) {
  const filters: Array<{ col: string; val: string }> = [];
  const apply = () => {
    const rows = allRows.filter((row) =>
      filters.every((f) => String(row[f.col] ?? "") === f.val),
    );
    return { data: rows, error: null };
  };
  const api = {
    select: () => api,
    eq: (col: string, val: string) => {
      filters.push({ col, val });
      return api;
    },
    order: () => ({
      limit: async () => apply(),
    }),
  };
  return api;
}

function mockTenant(agencyId: string) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "profiles") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { agency_id: agencyId },
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === "acquisition_accounts") {
      return makeListQuery([ACCOUNT_A, ACCOUNT_B]);
    }
    if (table === "acquisition_campaigns") {
      return makeListQuery([CAMPAIGN_A, CAMPAIGN_B]);
    }
    if (table === "acquisition_events") {
      return makeListQuery([EVENT_A, EVENT_B]);
    }
    throw new Error(`unexpected table ${table}`);
  });
}

describe("GET /api/acquisition/dashboard", () => {
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

  it("lists only the caller tenant accounts, campaigns, and events", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-a" } },
      error: null,
    });
    mockTenant("agency-a");

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.accounts).toHaveLength(1);
    expect(body.accounts[0].id).toBe("acct-a");
    expect(body.campaigns).toHaveLength(1);
    expect(body.campaigns[0].name).toBe("RKA-test-byty");
    expect(body.events).toHaveLength(1);
    expect(body.events[0].processing_status).toBe("LOGGED_TEST");
    expect(body.accounts.map((a: AccountRow) => a.agency_id)).not.toContain(
      "agency-b",
    );
    expect(JSON.stringify(body)).not.toContain("credential_ref");
    expect(JSON.stringify(body)).not.toContain("BEGIN PRIVATE KEY");
    expect(JSON.stringify(body)).not.toContain("metadata");
  });

  it("tenant B only sees B rows", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-b" } },
      error: null,
    });
    mockTenant("agency-b");

    const res = await GET();
    const body = await res.json();
    expect(body.accounts).toHaveLength(1);
    expect(body.accounts[0].agency_id).toBe("agency-b");
    expect(body.campaigns[0].name).toBe("RKB-test-domy");
    expect(body.events[0].provider_event_id).toBe("stage0-other");
  });
});
