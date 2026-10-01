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

type EventRow = {
  id: string;
  agency_id: string;
  lead_id: string | null;
  provider: string;
  event_type: string;
  provider_event_id: string;
  occurred_at: string;
  received_at: string;
  processing_status: string;
  error_code: string | null;
  processed_at: string | null;
  metadata: Record<string, unknown> | null;
};

const EVENT_A: EventRow = {
  id: "evt-a",
  agency_id: "agency-a",
  lead_id: null,
  provider: "GOOGLE",
  event_type: "LEAD_FORM",
  provider_event_id: "glead-a",
  occurred_at: "2026-08-15T10:00:00.000Z",
  received_at: "2026-08-15T10:00:01.000Z",
  processing_status: "LOGGED_STAGE0",
  error_code: null,
  processed_at: null,
  metadata: { is_test: false },
};

const EVENT_B: EventRow = {
  id: "evt-b",
  agency_id: "agency-b",
  lead_id: null,
  provider: "GOOGLE",
  event_type: "LEAD_FORM",
  provider_event_id: "glead-b",
  occurred_at: "2026-08-15T11:00:00.000Z",
  received_at: "2026-08-15T11:00:01.000Z",
  processing_status: "LOGGED_TEST",
  error_code: null,
  processed_at: null,
  metadata: { is_test: true },
};

function makeEventsQuery(allRows: EventRow[]) {
  const filters: Array<{ col: string; val: string }> = [];
  const api = {
    select: () => api,
    eq: (col: string, val: string) => {
      filters.push({ col, val });
      return api;
    },
    order: () => api,
    limit: async () => {
      const rows = allRows.filter((row) =>
        filters.every((f) => (row as Record<string, string>)[f.col] === f.val),
      );
      return { data: rows, error: null };
    },
  };
  return api;
}

function makeRequest(query = ""): Request {
  const qs = query ? `?${query}` : "";
  return new Request(`http://localhost/api/acquisition/audit-log${qs}`, {
    method: "GET",
  });
}

describe("GET /api/acquisition/audit-log", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("agency A user does not receive agency B rows (query agency_id ignored)", async () => {
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
      if (table === "acquisition_events") {
        return makeEventsQuery([EVENT_A, EVENT_B]);
      }
      throw new Error(`unexpected table ${table}`);
    });

    const res = await GET(makeRequest("agency_id=agency-b"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.events).toHaveLength(1);
    expect(body.events[0].id).toBe("evt-a");
    expect(body.events[0].agency_id).toBe("agency-a");
    expect(body.events.map((e: EventRow) => e.agency_id)).not.toContain("agency-b");
    expect(JSON.stringify(body)).not.toContain("glead-b");
  });

  it("tenant B only sees B events", async () => {
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
      if (table === "acquisition_events") {
        return makeEventsQuery([EVENT_A, EVENT_B]);
      }
      throw new Error(`unexpected table ${table}`);
    });

    const res = await GET(makeRequest("agency_id=agency-a"));
    const body = await res.json();
    expect(body.events).toHaveLength(1);
    expect(body.events[0].agency_id).toBe("agency-b");
  });
});
