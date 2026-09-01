import { describe, it, expect, vi, beforeEach } from "vitest";
import { linkProfileToAuthUser } from "@/lib/profiles/resolve-profile-for-auth";
import { resetAuthProfileRequestMemoForTests } from "@/lib/profiles/auth-profile-request-memo";

const serviceUpdateEq = vi.fn().mockResolvedValue({ error: null });
const serviceInResult = vi.fn().mockResolvedValue({ data: [] });
const serviceSelect = vi.fn(() => ({
  eq: () => ({
    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    in: () => serviceInResult(),
  }),
  ilike: () => ({
    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
  }),
}));

const serviceFrom = vi.fn().mockReturnValue({
  update: vi.fn().mockReturnValue({ eq: serviceUpdateEq }),
  select: serviceSelect,
});

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: serviceFrom,
  })),
}));

beforeEach(() => {
  resetAuthProfileRequestMemoForTests();
  serviceUpdateEq.mockClear();
  serviceFrom.mockClear();
  serviceInResult.mockReset();
  serviceInResult.mockResolvedValue({ data: [] });
});

function buildSupabaseWithEqLookups(
  eqResults: Record<string, unknown | null>,
  emailResult: unknown | null,
) {
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockReturnValue({ eq: updateEq });
  const select = vi.fn(() => ({
    eq: (column: string, value: string) => ({
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: eqResults[`${column}:${value}`] ?? null }),
    }),
    ilike: () => ({
      maybeSingle: vi.fn().mockResolvedValue({ data: emailResult }),
    }),
  }));
  const from = vi.fn().mockReturnValue({ select, update });
  const supabase = { from } as unknown as import("@supabase/supabase-js").SupabaseClient;
  return { supabase, update };
}

describe("linkProfileToAuthUser", () => {
  it("links auth_user_id when profile matched by legacy id only", async () => {
    const { supabase, update } = buildSupabaseWithEqLookups(
      {
        "auth_user_id:auth-uuid-1": null,
        "id:auth-uuid-1": {
          id: "prof-legacy",
          agency_id: "agency-smolko",
          auth_user_id: null,
          email: "office@realitysmolko.sk",
        },
      },
      null,
    );

    const linked = await linkProfileToAuthUser(supabase, "auth-uuid-1", "office@realitysmolko.sk");

    expect(update).toHaveBeenCalledWith({ auth_user_id: "auth-uuid-1" });
    expect(linked?.auth_user_id).toBe("auth-uuid-1");
    expect(linked?.agency_id).toBe("agency-smolko");
  });

  it("finds profile by email when auth/id lookup misses", async () => {
    const { supabase, update } = buildSupabaseWithEqLookups(
      {
        "auth_user_id:auth-new": null,
        "id:auth-new": null,
      },
      {
        id: "prof-email",
        agency_id: "agency-1",
        auth_user_id: null,
        email: "office@realitysmolko.sk",
      },
    );

    const linked = await linkProfileToAuthUser(supabase, "auth-new", "office@realitysmolko.sk");

    expect(update).toHaveBeenCalledWith({ auth_user_id: "auth-new" });
    expect(linked?.id).toBe("prof-email");
  });

  it("uses service role when RLS blocks auth_user_id update (profiles.id != auth.uid)", async () => {
    const userUpdateEq = vi.fn().mockResolvedValue({
      error: { message: "new row violates row-level security policy" },
    });
    const userUpdate = vi.fn().mockReturnValue({ eq: userUpdateEq });
    const select = vi.fn(() => ({
      eq: (column: string, value: string) => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data:
            column === "id" && value === "auth-smolko"
              ? null
              : column === "auth_user_id" && value === "auth-smolko"
                ? null
                : null,
        }),
      }),
      ilike: () => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: "profile-uuid-not-auth",
            agency_id: "agency-smolko",
            auth_user_id: null,
            email: "office@realitysmolko.sk",
          },
        }),
      }),
    }));
    const from = vi.fn().mockReturnValue({ select, update: userUpdate });
    const supabase = { from } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const linked = await linkProfileToAuthUser(
      supabase,
      "auth-smolko",
      "office@realitysmolko.sk",
    );

    expect(userUpdate).toHaveBeenCalledWith({ auth_user_id: "auth-smolko" });
    expect(serviceUpdateEq).toHaveBeenCalled();
    expect(linked?.auth_user_id).toBe("auth-smolko");
    expect(linked?.agency_id).toBe("agency-smolko");
  });

  it("does not link unbound Smolko owner profile to non-owner domain login", async () => {
    const { supabase, update } = buildSupabaseWithEqLookups(
      {
        "auth_user_id:auth-broker": {
          id: "profile-broker",
          agency_id: "11111111-1111-1111-1111-111111111111",
          auth_user_id: "auth-broker",
          email: "broker@realitysmolko.sk",
          role: "agent",
        },
        "id:auth-broker": null,
      },
      null,
    );

    serviceInResult.mockResolvedValue({
      data: [
        {
          id: "profile-owner",
          agency_id: "11111111-1111-1111-1111-111111111111",
          auth_user_id: null,
          email: "rastislav.smolko@gmail.com",
          role: "owner",
          ui_role: "owner_vision",
          account_tier: "market_vision",
        },
      ],
    });

    const linked = await linkProfileToAuthUser(
      supabase,
      "auth-broker",
      "broker@realitysmolko.sk",
    );

    expect(update).not.toHaveBeenCalledWith({ auth_user_id: "auth-broker" });
    expect(serviceUpdateEq).not.toHaveBeenCalled();
    expect(linked?.id).toBe("profile-broker");
    expect(linked?.role).toBe("agent");
  });
});
