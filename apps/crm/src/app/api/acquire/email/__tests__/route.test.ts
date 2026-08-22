import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const SECRET = "test-acquire-shared-secret";
const AGENCY_ID = "11111111-1111-1111-1111-111111111111";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

vi.mock("@/lib/acquire/inbound-lead-triage", () => ({
  runInboundLeadTriageAndNotify: vi.fn(async () => undefined),
}));

vi.mock("@/lib/acquire/inbound-lead-auto-response", () => ({
  runInboundLeadAutoResponse: vi.fn(async () => undefined),
}));

const INQUIRY_BODY = {
  version: 1,
  receivedAt: "2026-08-17T12:00:00.000Z",
  mailbox: { agencyId: AGENCY_ID },
  email: {
    to: "smolko@inbound.revolis.ai",
    subject: "nehnutelnosti.sk notification",
    text: `Meno: Jan Novak
E-mail: jan@example.com
Telefon: +421 912 345 678
Sprava: Chcem obhliadku co najskor
PO12345X`,
  },
};

function makeRequest(body: unknown = INQUIRY_BODY): NextRequest {
  return new NextRequest("http://localhost/api/acquire/email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-shared-secret": SECRET,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/acquire/email dedup claim", () => {
  let claimedKeys: Set<string>;
  let deletedKeys: string[];
  let leadInserts: number;
  let leadShouldFail: boolean;
  /** When true, SELECT pretends the key is absent (race: another worker claimed after our read). */
  let hideExistingOnSelect: boolean;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ACQUIRE_SHARED_SECRET", SECRET);
    claimedKeys = new Set();
    deletedKeys = [];
    leadInserts = 0;
    leadShouldFail = false;
    hideExistingOnSelect = false;

    mockFrom.mockImplementation((table: string) => {
      if (table === "acquire_dedup_keys") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => {
                if (hideExistingOnSelect || claimedKeys.size === 0) {
                  return { data: null, error: null };
                }
                const key = [...claimedKeys][0];
                return { data: { key }, error: null };
              },
            }),
          }),
          insert: async (payload: { key: string }) => {
            if (claimedKeys.has(payload.key)) {
              return {
                data: null,
                error: {
                  code: "23505",
                  message: "duplicate key value violates unique constraint",
                },
              };
            }
            claimedKeys.add(payload.key);
            return { data: payload, error: null };
          },
          delete: () => ({
            eq: async (_col: string, key: string) => {
              deletedKeys.push(key);
              claimedKeys.delete(key);
              return { data: null, error: null };
            },
          }),
        };
      }

      if (table === "leads") {
        return {
          insert: () => ({
            select: () => ({
              single: async () => {
                leadInserts += 1;
                if (leadShouldFail) {
                  return {
                    data: null,
                    error: { message: "insert aborted", code: "57014" },
                  };
                }
                return {
                  data: {
                    id: "lead-1",
                    name: "Jan Novak",
                    status: "Nový",
                    score: 50,
                    last_contact: "Práve vytvorený (email gateway)",
                    note: "n",
                    source: "portal:Nehnuteľnosti.sk",
                    agency_id: AGENCY_ID,
                    ai_triage_at: null,
                  },
                  error: null,
                };
              },
            }),
          }),
        };
      }

      if (table === "inbound_mailboxes") {
        return {
          update: () => ({
            eq: () => ({
              eq: async () => ({ data: null, error: null }),
            }),
          }),
        };
      }

      throw new Error(`unexpected table ${table}`);
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("releases dedup claim when lead insert fails so retries can recreate the lead", async () => {
    leadShouldFail = true;
    const { POST } = await import("../route");
    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
    expect(leadInserts).toBe(1);
    expect(claimedKeys.size).toBe(0);
    expect(deletedKeys).toHaveLength(1);

    leadShouldFail = false;
    const retry = await POST(makeRequest());
    expect(retry.status).toBe(200);
    const body = await retry.json();
    expect(body.lead_created).toBe(true);
    expect(leadInserts).toBe(2);
  });

  it("treats concurrent unique dedup conflict as already processed (no second lead)", async () => {
    const { POST } = await import("../route");
    const first = await POST(makeRequest());
    expect(first.status).toBe(200);
    expect((await first.json()).lead_created).toBe(true);
    expect(leadInserts).toBe(1);

    // Race: SELECT misses the key another worker already claimed; INSERT hits 23505.
    hideExistingOnSelect = true;
    const second = await POST(makeRequest());
    expect(second.status).toBe(200);
    const body = await second.json();
    expect(body.lead_created).toBe(false);
    expect(body.reason).toBe("duplicate");
    expect(leadInserts).toBe(1);
  });
});
