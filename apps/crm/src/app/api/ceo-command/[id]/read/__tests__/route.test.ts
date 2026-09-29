import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  resolveProfile: vi.fn(),
  isCeoCommandOwner: vi.fn(),
  notificationRow: vi.fn(),
  markNotificationRead: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/ceo-command/access", () => ({ isCeoCommandOwner: mocks.isCeoCommandOwner }));
vi.mock("@/lib/notifications/store", () => ({
  markNotificationRead: mocks.markNotificationRead,
}));
vi.mock("@/lib/profiles/resolve-profile-for-auth", () => ({
  resolveProfileForAuthUser: mocks.resolveProfile,
}));

const USER = { id: "auth-user-1", email: "ceo@example.com" };
const AGENCY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";
const AGENCY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0002";
const NOTIFICATION_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeee0005";

const request = new Request(`http://localhost/api/ceo-command/${NOTIFICATION_ID}/read`, {
  method: "POST",
});
const params = Promise.resolve({ id: NOTIFICATION_ID });

describe("POST /api/ceo-command/[id]/read — tenant brana", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: USER } });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: mocks.getUser },
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: mocks.notificationRow }) }),
      }),
    });
    mocks.resolveProfile.mockResolvedValue({ profile: { id: "p-1", agency_id: AGENCY_A } });
    mocks.isCeoCommandOwner.mockReturnValue(true);
    mocks.notificationRow.mockResolvedValue({
      data: { id: NOTIFICATION_ID, agency_id: AGENCY_A, type: "ceo_command" },
    });
    mocks.markNotificationRead.mockResolvedValue(undefined);
  });

  it("volajuci BEZ agentury neoznaci precitanym ziadne oznamenie", async () => {
    mocks.resolveProfile.mockResolvedValue({ profile: { id: "p-1", agency_id: null } });
    mocks.notificationRow.mockResolvedValue({
      data: { id: NOTIFICATION_ID, agency_id: AGENCY_B, type: "ceo_command" },
    });

    const res = await POST(request, { params });

    expect(res.status).toBe(403);
    expect(mocks.markNotificationRead).not.toHaveBeenCalled();
  });

  it("volajuci s agenturou stale neoznaci cudzie oznamenie", async () => {
    mocks.notificationRow.mockResolvedValue({
      data: { id: NOTIFICATION_ID, agency_id: AGENCY_B, type: "ceo_command" },
    });

    const res = await POST(request, { params });

    expect(res.status).toBe(403);
    expect(mocks.markNotificationRead).not.toHaveBeenCalled();
  });

  it("volajuci oznaci precitanym vlastne oznamenie", async () => {
    const res = await POST(request, { params });

    expect(res.status).toBe(200);
    expect(mocks.markNotificationRead).toHaveBeenCalledTimes(1);
  });
});
