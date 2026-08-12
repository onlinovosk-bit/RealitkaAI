import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";

const FAKE_PRIVATE_KEY =
  "-----BEGIN PRIVATE KEY-----\nTEST_PRIVATE_KEY_MATERIAL_NOT_REAL\n-----END PRIVATE KEY-----\n";
const FAKE_SA_JSON = JSON.stringify({
  type: "service_account",
  client_email: "ads-sa@example-test.iam.gserviceaccount.com",
  private_key: FAKE_PRIVATE_KEY,
});
const FAKE_DEVELOPER_TOKEN = "dev-token-TEST-NEVER-REAL-xyz";
const LOGIN_CUSTOMER_ID = "1112223333";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

function stubCredEnv() {
  vi.stubEnv("GOOGLE_ADS_DEVELOPER_TOKEN", FAKE_DEVELOPER_TOKEN);
  vi.stubEnv("GOOGLE_ADS_LOGIN_CUSTOMER_ID", LOGIN_CUSTOMER_ID);
  vi.stubEnv("GOOGLE_ADS_SA_KEY_JSON", FAKE_SA_JSON);
  vi.stubEnv("GOOGLE_ADS_RATE_LIMIT_PER_TENANT", "10");
}

function makeRequest(body: object): Request {
  return new Request("http://localhost/api/acquisition/google/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/acquisition/google/connect", () => {
  let insertPayload: Record<string, unknown> | null;

  beforeEach(() => {
    vi.clearAllMocks();
    stubCredEnv();
    insertPayload = null;

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
        return {
          insert: (payload: Record<string, unknown>) => {
            insertPayload = payload;
            return {
              select: () => ({
                single: async () => ({
                  data: {
                    id: "acct-1",
                    agency_id: payload.agency_id,
                    provider: payload.provider,
                    customer_id: payload.customer_id,
                    manager_customer_id: payload.manager_customer_id,
                    status: payload.status,
                    credential_type: payload.credential_type,
                    billing_owner: payload.billing_owner,
                    created_at: "2026-08-12T00:00:00.000Z",
                    connected_at: null,
                    last_sync_at: null,
                  },
                  error: null,
                }),
              }),
            };
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

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(401);
  });

  it("uses agency_id from auth context and ignores client agency_id + customer_id", async () => {
    const res = await POST(
      makeRequest({
        agency_id: "agency-EVIL-from-client",
        customer_id: "9998887777",
        manager_customer_id: "9998887777",
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.account.agency_id).toBe("agency-a");
    expect(body.account.customer_id).toBe(LOGIN_CUSTOMER_ID);
    expect(body.account.status).toBe("PENDING");

    expect(insertPayload).toMatchObject({
      agency_id: "agency-a",
      customer_id: LOGIN_CUSTOMER_ID,
      status: "PENDING",
      provider: "GOOGLE",
      credential_ref: "env:GOOGLE_ADS_SA_KEY_JSON",
      credential_type: "SERVICE_ACCOUNT",
    });
    expect(insertPayload?.agency_id).not.toBe("agency-EVIL-from-client");
    expect(insertPayload?.customer_id).not.toBe("9998887777");
  });

  it("never returns credential secrets in the response", async () => {
    const res = await POST(makeRequest({ customer_id: "9998887777" }));
    const text = await res.text();
    expect(text).not.toContain(FAKE_DEVELOPER_TOKEN);
    expect(text).not.toContain(FAKE_PRIVATE_KEY);
    expect(text).not.toContain(FAKE_SA_JSON);
    expect(text).not.toContain("credential_ref");
    const json = JSON.parse(text);
    expect(json.account.status).toBe("PENDING");
  });

  it("does not log credential secrets", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await POST(makeRequest({}));

    const dumped = [...errorSpy.mock.calls, ...logSpy.mock.calls]
      .map((args) => args.map(String).join(" "))
      .join("\n");
    expect(dumped).not.toContain(FAKE_DEVELOPER_TOKEN);
    expect(dumped).not.toContain(FAKE_PRIVATE_KEY);
    expect(dumped).not.toContain(FAKE_SA_JSON);
  });

  it("returns 503 with explicit env name when credentials missing", async () => {
    vi.stubEnv("GOOGLE_ADS_SA_KEY_JSON", "");
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toContain("GOOGLE_ADS_SA_KEY_JSON");
    expect(JSON.stringify(body)).not.toContain(FAKE_PRIVATE_KEY);
  });
});