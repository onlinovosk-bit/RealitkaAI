import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * ghostwriter_letters has no tenant column. The old stamp selected
 * `profile_id`, the select failed, and `!letter` still updated any id
 * through the service role. The route must not write that table.
 */

const getUserMock = vi.fn();
const resolveProfileMock = vi.fn();
const resendSendMock = vi.fn();
const logAiActionMock = vi.fn();
const rateLimitMock = vi.fn();
const adminFromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: () => getUserMock() } }),
  createAdminClient: () => ({ from: (...args: unknown[]) => adminFromMock(...args) }),
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

function post(body: Record<string, unknown>): Request {
  return new Request("https://crm.local/api/ghostwriter/send-email", {
    method: "POST",
    body: JSON.stringify(body),
  });
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
      profile: { id: "profile-caller", agency_id: "agency-A", email: "makler@a.sk" },
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

  it("sends the letter and does not touch ghostwriter_letters", async () => {
    const { POST } = await import("@/app/api/ghostwriter/send-email/route");
    const response = await POST(post({
      letterId: "11111111-1111-4111-8111-111111111111",
      recipientEmail: "majitel@example.sk",
      letterHtml: "<p>List</p>",
      ownerAddress: "Hlavná 1",
    }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({ ok: true, emailId: "email-1" });
    expect(adminFromMock).not.toHaveBeenCalled();
    expect(resendSendMock).toHaveBeenCalledTimes(1);
  });
});
