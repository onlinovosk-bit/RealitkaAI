/**
 * `POST /api/invite` sent the invite email and answered `ok: true` while
 * creating no profile at all.
 *
 * `profiles.agency_id` is NOT NULL in the schema and the upsert supplied no
 * agency, so the insert could not succeed. Its error was never read. The
 * colleague accepted the invite, logged in, and had no profile — the failure
 * surfaced days later as an empty CRM, nowhere near the route that caused it.
 *
 * The same upsert put the AUTH user id into `profiles.id`, which is the table's
 * own generated primary key, and left `auth_user_id` — the column every lookup
 * resolves a caller by — empty.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const CALLER_AGENCY = "aaaaaaaa-0000-0000-0000-000000000001";
const OTHER_AGENCY = "bbbbbbbb-0000-0000-0000-000000000002";
const NEW_AUTH_ID = "auth-new-1";

const mockGetUser = vi.hoisted(() => vi.fn());
const mockCallerProfile = vi.hoisted(() => vi.fn());
const mockExistingByEmail = vi.hoisted(() => vi.fn());
const mockInvite = vi.hoisted(() => vi.fn());
const mockUpsert = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: () => ({ select: () => ({ eq: () => ({ single: mockCallerProfile }) }) }),
  }),
  createAdminClient: () => ({
    auth: { admin: { inviteUserByEmail: mockInvite } },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mockExistingByEmail }) }),
      upsert: mockUpsert,
    }),
  }),
}));

const post = async (body: Record<string, unknown>) => {
  const { POST } = await import("../route");
  return POST(new Request("http://localhost/api/invite", {
    method: "POST",
    body: JSON.stringify(body),
  }));
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "auth-owner" } } });
  mockCallerProfile.mockResolvedValue({ data: { role: "owner", agency_id: CALLER_AGENCY } });
  mockExistingByEmail.mockResolvedValue({ data: null });
  mockInvite.mockResolvedValue({ data: { user: { id: NEW_AUTH_ID } }, error: null });
  mockUpsert.mockResolvedValue({ error: null });
});

describe("invite — the profile row is actually created, in the caller's agency", () => {
  it("stamps agency_id and auth_user_id, and does not write the auth id into the primary key", async () => {
    const res = await post({ email: "kolega@example.com", fullName: "Kolega", role: "agent" });

    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledTimes(1);

    const row = mockUpsert.mock.calls[0][0];
    expect(row.agency_id).toBe(CALLER_AGENCY);
    expect(row.auth_user_id).toBe(NEW_AUTH_ID);
    expect(row).not.toHaveProperty("id");
  });

  it("reports failure instead of ok:true when the profile write fails", async () => {
    mockUpsert.mockResolvedValue({ error: { message: "null value in column agency_id" } });

    const res = await post({ email: "kolega@example.com", fullName: "Kolega" });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.ok).toBe(false);
  });

  it("an owner whose own profile has no agency cannot invite", async () => {
    mockCallerProfile.mockResolvedValue({ data: { role: "owner", agency_id: null } });

    const res = await post({ email: "kolega@example.com", fullName: "Kolega" });

    expect(res.status).toBe(403);
    expect(mockInvite).not.toHaveBeenCalled();
  });

  it("an email already belonging to another agency is refused, not re-homed", async () => {
    mockExistingByEmail.mockResolvedValue({ data: { agency_id: OTHER_AGENCY } });

    const res = await post({ email: "cudzi@example.com", fullName: "Cudzí" });

    expect(res.status).toBe(409);
    expect(mockInvite).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("a role from the request body cannot escalate beyond the invitable set", async () => {
    const res = await post({ email: "k@example.com", fullName: "K", role: "founder" });

    expect(res.status).toBe(400);
    expect(mockInvite).not.toHaveBeenCalled();
  });
});
