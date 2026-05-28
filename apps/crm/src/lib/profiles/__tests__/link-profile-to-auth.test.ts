import { describe, it, expect, vi } from "vitest";
import { linkProfileToAuthUser } from "@/lib/profiles/resolve-profile-for-auth";

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

  it("prefers auth_user_id row when legacy duplicate exists", async () => {
    const { supabase } = buildSupabaseWithEqLookups(
      {
        "auth_user_id:auth-smolko": {
          id: "profile-auth",
          agency_id: "agency-smolko",
          auth_user_id: "auth-smolko",
          email: "office@realitysmolko.sk",
        },
        "id:auth-smolko": {
          id: "profile-legacy",
          agency_id: "agency-smolko",
          auth_user_id: null,
          email: "office@realitysmolko.sk",
        },
      },
      null,
    );

    const linked = await linkProfileToAuthUser(supabase, "auth-smolko", "office@realitysmolko.sk");

    expect(linked?.id).toBe("profile-auth");
    expect(linked?.auth_user_id).toBe("auth-smolko");
  });
});
