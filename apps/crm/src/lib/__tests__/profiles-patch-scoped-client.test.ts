import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveTenantSupabaseMock = vi.fn();

vi.mock("@/lib/supabase/resolve-client", () => ({
  resolveTenantSupabase: (...args: unknown[]) => resolveTenantSupabaseMock(...args),
}));

const ROW = {
  id: "profile-1",
  agency_id: "agency-1",
  team_id: null,
  full_name: "Nové Meno",
  email: "novy@example.sk",
  role: "agent",
  phone: "+421900111222",
  is_active: true,
};

/** Minimal Supabase update().eq().select().single() chain recorder. */
function updatingClient() {
  const calls: Array<Record<string, unknown>> = [];
  return {
    calls,
    from: () => ({
      update: (patch: Record<string, unknown>) => {
        calls.push(patch);
        return {
          eq: () => ({
            select: () => ({
              single: async () => ({ data: ROW, error: null }),
            }),
          }),
        };
      },
    }),
  };
}

describe("updateProfile — scoped client is threaded through", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the caller's scoped client to resolveTenantSupabase", async () => {
    const client = updatingClient();
    resolveTenantSupabaseMock.mockResolvedValue(client);
    const scoped = { marker: "scoped-client" } as never;

    const { updateProfile } = await import("@/lib/team-store");
    await updateProfile("profile-1", { fullName: "Nové Meno" }, scoped);

    expect(resolveTenantSupabaseMock).toHaveBeenCalledWith(scoped);
  });

  it("maps the self-service fields onto the row patch", async () => {
    const client = updatingClient();
    resolveTenantSupabaseMock.mockResolvedValue(client);

    const { updateProfile } = await import("@/lib/team-store");
    const updated = await updateProfile(
      "profile-1",
      {
        fullName: "Nové Meno",
        email: "novy@example.sk",
        phone: "+421900111222",
        teamId: null,
      },
      {} as never,
    );

    expect(client.calls[0]).toEqual({
      full_name: "Nové Meno",
      email: "novy@example.sk",
      phone: "+421900111222",
      team_id: null,
    });
    expect(updated).toMatchObject({ id: "profile-1", fullName: "Nové Meno" });
  });

  it("surfaces the RLS rejection instead of reporting a silent success", async () => {
    resolveTenantSupabaseMock.mockResolvedValue({
      from: () => ({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({
                data: null,
                error: { message: "new row violates row-level security policy" },
              }),
            }),
          }),
        }),
      }),
    });

    const { updateProfile } = await import("@/lib/team-store");

    await expect(
      updateProfile("profile-1", { fullName: "X" }, {} as never),
    ).rejects.toThrow(/row-level security/);
  });
});
