import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";

const WEBHOOK_KEY = "test-google-webhook-key-not-real";
const CUSTOMER_ID = "1112223333";
const AGENCY_A = "agency-a";
const GOOGLE_LEAD_ID = "TeSter-123-ABCDEF";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: async () => ({ data: 1, error: null }),
  }),
}));

function makeRequest(opts: {
  body?: unknown;
  query?: Record<string, string>;
  headers?: Record<string, string>;
}): Request {
  const url = new URL("http://localhost/api/acquisition/google/lead-webhook");
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    url.searchParams.set(k, v);
  }
  const headers = new Headers(opts.headers ?? {});
  if (opts.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return new Request(url, {
    method: "POST",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

describe("POST /api/acquisition/google/lead-webhook", () => {
  let eventInserts: Array<Record<string, unknown>>;
  let leadsInserts: number;
  let knownEventKeys: Set<string>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("GOOGLE_ADS_WEBHOOK_KEY", WEBHOOK_KEY);
    eventInserts = [];
    leadsInserts = 0;
    knownEventKeys = new Set();

    mockFrom.mockImplementation((table: string) => {
      if (table === "leads") {
        return {
          insert: () => {
            leadsInserts += 1;
            throw new Error("Stage 0 webhook must never insert into leads");
          },
        };
      }

      if (table === "acquisition_accounts") {
        const api = {
          select: () => api,
          eq: () => api,
          maybeSingle: async () => ({
            data: { agency_id: AGENCY_A, customer_id: CUSTOMER_ID },
            error: null,
          }),
        };
        return api;
      }

      if (table === "acquisition_campaigns") {
        const api = {
          select: () => api,
          eq: () => api,
          maybeSingle: async () => ({ data: null, error: null }),
        };
        return api;
      }

      if (table === "acquisition_events") {
        const filters: Record<string, string> = {};
        return {
          select: () => ({
            eq: (col: string, val: string) => {
              filters[col] = val;
              const chain = {
                eq: (c: string, v: string) => {
                  filters[c] = v;
                  return chain;
                },
                maybeSingle: async () => {
                  const key = [
                    filters.agency_id,
                    filters.provider,
                    filters.provider_event_id,
                    filters.event_type,
                  ].join("|");
                  if (knownEventKeys.has(key)) {
                    return { data: { id: "evt-existing" }, error: null };
                  }
                  return { data: null, error: null };
                },
              };
              return chain;
            },
          }),
          insert: async (payload: Record<string, unknown>) => {
            eventInserts.push(payload);
            const key = [
              payload.agency_id,
              payload.provider,
              payload.provider_event_id,
              payload.event_type,
            ].join("|");
            if (knownEventKeys.has(key)) {
              return {
                data: null,
                error: { code: "23505", message: "duplicate key value violates unique constraint" },
              };
            }
            knownEventKeys.add(key);
            return { data: { id: `evt-${eventInserts.length}` }, error: null };
          },
        };
      }

      throw new Error(`unexpected table ${table}`);
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("is_test=true logs event and does not insert into leads", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const res = await POST(
      makeRequest({
        headers: { "x-google-key": WEBHOOK_KEY, "Content-Type": "application/json" },
        body: {
          lead_id: GOOGLE_LEAD_ID,
          customer_id: CUSTOMER_ID,
          campaign_id: "999",
          is_test: true,
          google_key: WEBHOOK_KEY,
          user_column_data: [{ column_name: "User Email", string_value: "secret@example.com" }],
        },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.lead_created).toBe(false);
    expect(body.lead_id).toBeNull();
    expect(body.processing_status).toBe("LOGGED_TEST");
    expect(eventInserts).toHaveLength(1);
    expect(eventInserts[0]).toMatchObject({
      agency_id: AGENCY_A,
      lead_id: null,
      provider: "GOOGLE",
      event_type: "lead.form_submitted",
      provider_event_id: GOOGLE_LEAD_ID,
      processing_status: "LOGGED_TEST",
    });
    expect(leadsInserts).toBe(0);
    expect(JSON.stringify(body)).not.toContain(WEBHOOK_KEY);
    expect(JSON.stringify(body)).not.toContain("secret@example.com");
    const dumped = logSpy.mock.calls.map((args) => args.map(String).join(" ")).join("\n");
    expect(dumped).not.toContain(WEBHOOK_KEY);
    expect(dumped).not.toContain("secret@example.com");
  });

  it("returns 401 when google_key is missing", async () => {
    const res = await POST(
      makeRequest({
        body: { lead_id: GOOGLE_LEAD_ID, customer_id: CUSTOMER_ID, is_test: true },
      }),
    );
    expect(res.status).toBe(401);
    expect(eventInserts).toHaveLength(0);
    expect(leadsInserts).toBe(0);
  });

  it("returns 401 when google_key is wrong", async () => {
    const res = await POST(
      makeRequest({
        headers: { "x-google-key": "wrong-key" },
        body: { lead_id: GOOGLE_LEAD_ID, customer_id: CUSTOMER_ID, google_key: "also-wrong" },
      }),
    );
    expect(res.status).toBe(401);
    expect(eventInserts).toHaveLength(0);
    expect(leadsInserts).toBe(0);
  });

  it("duplicate provider_event_id returns 200 already_processed with a single insert", async () => {
    const payload = {
      lead_id: GOOGLE_LEAD_ID,
      customer_id: CUSTOMER_ID,
      is_test: true,
      google_key: WEBHOOK_KEY,
    };

    const first = await POST(makeRequest({ body: payload }));
    expect(first.status).toBe(200);
    expect(eventInserts).toHaveLength(1);

    const second = await POST(makeRequest({ body: payload }));
    expect(second.status).toBe(200);
    const body = await second.json();
    expect(body.ok).toBe(true);
    expect(body.already_processed).toBe(true);
    expect(body.lead_created).toBe(false);
    expect(eventInserts).toHaveLength(1);
    expect(knownEventKeys.size).toBe(1);
    expect(leadsInserts).toBe(0);
  });

  it("non-test Stage 0 still does not insert into leads", async () => {
    const res = await POST(
      makeRequest({
        query: { google_key: WEBHOOK_KEY },
        body: {
          lead_id: "real-lead-456",
          customer_id: CUSTOMER_ID,
          is_test: false,
          user_column_data: [{ column_name: "Full Name", string_value: "Jane Doe" }],
        },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lead_created).toBe(false);
    expect(body.lead_id).toBeNull();
    expect(body.processing_status).toBe("LOGGED_STAGE0");
    expect(eventInserts).toHaveLength(1);
    expect(eventInserts[0]).toMatchObject({
      lead_id: null,
      processing_status: "LOGGED_STAGE0",
      provider: "GOOGLE",
    });
    expect(leadsInserts).toBe(0);
    expect(JSON.stringify(body)).not.toContain("Jane Doe");
    expect(JSON.stringify(body)).not.toContain(WEBHOOK_KEY);
  });
});
