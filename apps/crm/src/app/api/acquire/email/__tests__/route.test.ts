import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const SECRET = "test-acquire-shared-secret";
const AGENCY_ID = "11111111-1111-1111-1111-111111111111";
const PROFILE_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_PROFILE_ID = "33333333-3333-4333-8333-333333333333";

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
  let leadRows: Map<string, Record<string, unknown>>;
  let leadInserts: number;
  let leadShouldFail: boolean;
  let leadCommitsDespiteError: boolean;
  /** When true, SELECT pretends the key is absent (race: another worker claimed after our read). */
  let hideExistingOnSelect: boolean;
  /** `inbound_mailboxes.profile_id` for the address the mail arrived at (null = agency mailbox). */
  let mailboxProfileId: string | null;
  /** Row returned from `profiles`; null simulates a profile outside the agency. */
  let profileRow: { full_name: string | null } | null;
  let mailboxReceivedUpdates: number;
  let ownerBackfills: Array<Record<string, unknown>>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ACQUIRE_SHARED_SECRET", SECRET);
    claimedKeys = new Set();
    deletedKeys = [];
    leadRows = new Map();
    leadInserts = 0;
    leadShouldFail = false;
    leadCommitsDespiteError = false;
    hideExistingOnSelect = false;
    mailboxProfileId = null;
    profileRow = null;
    mailboxReceivedUpdates = 0;
    ownerBackfills = [];

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
          insert: (payload: Record<string, unknown>) => ({
            select: () => ({
              single: async () => {
                leadInserts += 1;
                if (leadRows.has(String(payload.id))) {
                  return {
                    data: null,
                    error: {
                      code: "23505",
                      message: "duplicate key value violates unique constraint",
                    },
                  };
                }
                const row = {
                  id: payload.id,
                  name: payload.name,
                  status: payload.status,
                  score: payload.score,
                  last_contact: payload.last_contact,
                  note: payload.note,
                  source: payload.source,
                  agency_id: payload.agency_id,
                  ai_triage_at: null,
                  assigned_profile_id: payload.assigned_profile_id ?? null,
                  assigned_agent: payload.assigned_agent,
                };
                if (leadShouldFail) {
                  if (leadCommitsDespiteError) {
                    leadRows.set(String(payload.id), row);
                  }
                  return {
                    data: null,
                    error: { message: "insert aborted", code: "57014" },
                  };
                }
                leadRows.set(String(payload.id), row);
                return { data: row, error: null };
              },
            }),
          }),
          select: () => ({
            eq: (_col: string, id: string) => ({
              maybeSingle: async () => ({
                data: leadRows.get(id) ?? null,
                error: null,
              }),
            }),
          }),
          // backfillLeadOwner: .update().eq(id).eq(agency).is(assigned_profile_id, null).select()
          update: (payload: Record<string, unknown>) => ({
            eq: (_idCol: string, id: string) => ({
              eq: (_agencyCol: string, agency: string) => ({
                is: (col: string, value: null) => ({
                  select: async () => {
                    const row = leadRows.get(id);
                    if (!row || row.agency_id !== agency) {
                      return { data: [], error: null };
                    }
                    // `.is(col, null)` must actually gate the write, otherwise a manual
                    // assignment would silently get overwritten by a later duplicate.
                    if ((row as Record<string, unknown>)[col] !== value) {
                      return { data: [], error: null };
                    }
                    Object.assign(row, payload);
                    ownerBackfills.push({ id, ...payload });
                    return { data: [{ id }], error: null };
                  },
                }),
              }),
            }),
          }),
        };
      }

      if (table === "inbound_mailboxes") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { profile_id: mailboxProfileId },
                  error: null,
                }),
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: async () => {
                mailboxReceivedUpdates += 1;
                return { data: null, error: null };
              },
            }),
          }),
        };
      }

      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: profileRow, error: null }),
              }),
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

  it("uses a deterministic lead id so retry after an unknown commit cannot duplicate the lead", async () => {
    leadShouldFail = true;
    leadCommitsDespiteError = true;
    const { POST } = await import("../route");

    const first = await POST(makeRequest());
    expect(first.status).toBe(500);
    expect(leadInserts).toBe(1);
    expect(claimedKeys.size).toBe(0);
    expect(deletedKeys).toHaveLength(1);
    expect(leadRows.size).toBe(1);
    const [committedLeadId] = [...leadRows.keys()];

    leadShouldFail = false;
    leadCommitsDespiteError = false;
    const retry = await POST(makeRequest());
    expect(retry.status).toBe(200);
    const body = await retry.json();
    expect(body.lead_created).toBe(false);
    expect(body.reason).toBe("duplicate");
    expect(body.lead_id).toBe(committedLeadId);
    expect(leadInserts).toBe(2);
    expect(leadRows.size).toBe(1);
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

  it("assigns the lead to the broker whose inbound address received the mail", async () => {
    mailboxProfileId = PROFILE_ID;
    profileRow = { full_name: "Testovaci Makler" };
    const { POST } = await import("../route");

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect((await res.json()).lead_created).toBe(true);

    const [lead] = [...leadRows.values()];
    expect(lead.assigned_profile_id).toBe(PROFILE_ID);
    expect(lead.assigned_agent).toBe("Testovaci Makler");
  });

  it("leaves the lead unassigned for an agency mailbox (profile_id is null)", async () => {
    mailboxProfileId = null;
    const { POST } = await import("../route");

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    const [lead] = [...leadRows.values()];
    expect(lead.assigned_profile_id).toBeNull();
    expect(lead.assigned_agent).toBe("Nepriradený");
  });

  it("does not assign when the mailbox profile belongs to another agency", async () => {
    mailboxProfileId = PROFILE_ID;
    profileRow = null; // agency-scoped lookup returned nothing
    const { POST } = await import("../route");

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    const [lead] = [...leadRows.values()];
    expect(lead.assigned_profile_id).toBeNull();
    expect(lead.assigned_agent).toBe("Nepriradený");
  });

  it("backfills the owner when the office copy arrived first and the broker copy is a duplicate", async () => {
    const { POST } = await import("../route");

    // 1. office@ copy — agency mailbox, no owner
    mailboxProfileId = null;
    profileRow = null;
    const first = await POST(makeRequest());
    expect((await first.json()).lead_created).toBe(true);
    const [lead] = [...leadRows.values()];
    expect(lead.assigned_profile_id).toBeNull();

    // 2. the same portal notification, this time via the broker's address
    mailboxProfileId = PROFILE_ID;
    profileRow = { full_name: "Testovaci Makler" };
    const second = await POST(makeRequest());
    const body = await second.json();
    expect(body.lead_created).toBe(false);
    expect(body.reason).toBe("duplicate");
    expect(body.owner_backfilled).toBe(true);

    expect(lead.assigned_profile_id).toBe(PROFILE_ID);
    expect(lead.assigned_agent).toBe("Testovaci Makler");
    expect(leadInserts).toBe(1);
  });

  it("never overwrites an assignment that already exists", async () => {
    const { POST } = await import("../route");

    mailboxProfileId = PROFILE_ID;
    profileRow = { full_name: "Prvy Makler" };
    await POST(makeRequest());
    const [lead] = [...leadRows.values()];
    expect(lead.assigned_profile_id).toBe(PROFILE_ID);

    // A duplicate from a different broker address must not steal the lead.
    mailboxProfileId = OTHER_PROFILE_ID;
    profileRow = { full_name: "Druhy Makler" };
    const second = await POST(makeRequest());
    expect((await second.json()).owner_backfilled).toBe(false);

    expect(lead.assigned_profile_id).toBe(PROFILE_ID);
    expect(lead.assigned_agent).toBe("Prvy Makler");
    expect(ownerBackfills).toHaveLength(0);
  });

  it("records delivery on the mailbox even when no lead is created", async () => {
    const { POST } = await import("../route");
    const notALead = { ...INQUIRY_BODY, email: { ...INQUIRY_BODY.email, text: "ziadny kontakt" } };

    const res = await POST(makeRequest(notALead));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lead_created).toBe(false);
    expect(body.reason).toBe("not_a_lead");

    // The heartbeat is what tells a broken forwarding rule apart from a quiet week.
    expect(mailboxReceivedUpdates).toBe(1);
    expect(leadInserts).toBe(0);
  });
});
