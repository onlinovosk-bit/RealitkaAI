import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Failed or missing ownership read must not stamp a ghostwriter letter.
 * The service-role update used to run whenever the select returned no row
 * (`!letter`), including the error from selecting `profile_id` on a table
 * that does not have that column.
 */

const getUserMock = vi.fn();
const resolveProfileMock = vi.fn();
const resendSendMock = vi.fn();
const logAiActionMock = vi.fn();
const rateLimitMock = vi.fn();
const letterLookupMock = vi.fn();
const adminUpdateMock = vi.fn();
const updateEqMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: () => getUserMock() } }),
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: () => letterLookupMock() }),
      }),
      update: (payload: unknown) => {
        adminUpdateMock(payload);
        return {
          eq: (column: string, value: string) => {
            updateEqMock(column, value);
            return {
              eq: (column2: string, value2: string) => {
                updateEqMock(column2, value2);
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      },
    }),
  }),
}));
vi.mock("@/lib/ai/rate-guard", () => ({
  checkAiRateLimit: (...a: unknown[]) => rateLimitMock(...a),
}));
vi.mock("@/lib/profiles/resolve-profile-for-auth", () => ({
  resolveProfileForAuthUser: (...a: unknown[]) => resolveProfileMock(...a),
}));
vi.mock("@/lib/ai-action-audit", () => ({
  logAiAction: (...a: unknown[]) => logAiActionMock(...a),
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: (...a: unknown[]) => resendSendMock(...a) };
  },
}));

const LETTER_ID = "11111111-1111-4111-8111-111111111111";
const CALLER_PROFILE = "profile-caller";

function post(body: Record<string, unknown>): Request {
  return new Request("https://crm.local/api/ghostwriter/send-email", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const VALID = {
  letterId: LETTER_ID,
  recipientEmail: "majitel@example.sk",
  letterHtml: "<p>List</p>",
  ownerAddress: "Hlavná 1",
};

async function callRoute() {
  const { POST } = await import("@/app/api/ghostwriter/send-email/route");
  const response = await POST(post(VALID));
  return { response, json: await response.json() };
}

describe("ghostwriter letter stamp fails closed", () => {
  const savedKill = process.env.AGENT_KILL_SWITCH;
  const savedKey = process.env.RESEND_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AGENT_KILL_SWITCH;
    process.env.RESEND_API_KEY = "re_test_mock";
    getUserMock.mockResolvedValue({ data: { user: { id: "u-1", email: "makler@a.sk" } } });
    resolveProfileMock.mockResolvedValue({
      profile: { id: CALLER_PROFILE, agency_id: "agency-A", email: "makler@a.sk" },
    });
    rateLimitMock.mockResolvedValue(null);
    resendSendMock.mockResolvedValue({ data: { id: "email-1" }, error: null });
    logAiActionMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (savedKill === undefined) delete process.env.AGENT_KILL_SWITCH;
    else process.env.AGENT_KILL_SWITCH = savedKill;
    if (savedKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = savedKey;
  });

  it("select error does not update through the service role", async () => {
    letterLookupMock.mockResolvedValue({
      data: null,
      error: { message: "column profile_id does not exist" },
    });

    const { response, json } = await callRoute();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({ ok: true, emailId: "email-1" });
    expect(adminUpdateMock).not.toHaveBeenCalled();
  });

  it("missing row does not update", async () => {
    letterLookupMock.mockResolvedValue({ data: null, error: null });

    const { response } = await callRoute();

    expect(response.status).toBe(200);
    expect(adminUpdateMock).not.toHaveBeenCalled();
  });

  it("null profile_id is not ownership", async () => {
    letterLookupMock.mockResolvedValue({ data: { profile_id: null }, error: null });

    const { response } = await callRoute();

    expect(response.status).toBe(200);
    expect(adminUpdateMock).not.toHaveBeenCalled();
  });

  it("another profile's letter is not stamped", async () => {
    letterLookupMock.mockResolvedValue({
      data: { profile_id: "profile-other" },
      error: null,
    });

    const { response } = await callRoute();

    expect(response.status).toBe(200);
    expect(adminUpdateMock).not.toHaveBeenCalled();
  });

  it("matching profile_id stamps that letter only", async () => {
    letterLookupMock.mockResolvedValue({
      data: { profile_id: CALLER_PROFILE },
      error: null,
    });

    const { response } = await callRoute();

    expect(response.status).toBe(200);
    expect(adminUpdateMock).toHaveBeenCalledWith({
      email_sent_to: "majitel@example.sk",
      sent_at: expect.any(String),
    });
    expect(updateEqMock).toHaveBeenCalledWith("id", LETTER_ID);
    expect(updateEqMock).toHaveBeenCalledWith("profile_id", CALLER_PROFILE);
  });
});
