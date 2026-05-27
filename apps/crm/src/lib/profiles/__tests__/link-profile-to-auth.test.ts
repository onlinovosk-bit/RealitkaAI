import { describe, it, expect, vi } from "vitest";
import { linkProfileToAuthUser } from "@/lib/profiles/resolve-profile-for-auth";

describe("linkProfileToAuthUser", () => {
  it("links auth_user_id when profile matched by legacy id only", async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "prof-legacy", agency_id: "agency-smolko", auth_user_id: null, email: "office@realitysmolko.sk" },
    });
    const or = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ or });
    const from = vi.fn().mockReturnValue({ select, update });

    const supabase = { from } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const linked = await linkProfileToAuthUser(supabase, "auth-uuid-1", "office@realitysmolko.sk");

    expect(update).toHaveBeenCalledWith({ auth_user_id: "auth-uuid-1" });
    expect(linked?.auth_user_id).toBe("auth-uuid-1");
    expect(linked?.agency_id).toBe("agency-smolko");
  });

  it("finds profile by email when auth/id lookup misses", async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq: updateEq });
    const maybeSingleAuth = vi.fn().mockResolvedValue({ data: null });
    const maybeSingleEmail = vi.fn().mockResolvedValue({
      data: { id: "prof-email", agency_id: "agency-1", auth_user_id: null, email: "office@realitysmolko.sk" },
    });
    const eqEmail = vi.fn().mockReturnValue({ maybeSingle: maybeSingleEmail });
    const or = vi.fn().mockReturnValue({ maybeSingle: maybeSingleAuth });
    let selectCalls = 0;
    const select = vi.fn(() => {
      selectCalls += 1;
      return selectCalls === 1 ? { or } : { eq: eqEmail };
    });

    const from = vi.fn(() => ({ select, update }));
    const supabase = { from } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const linked = await linkProfileToAuthUser(supabase, "auth-new", "office@realitysmolko.sk");

    expect(eqEmail).toHaveBeenCalledWith("email", "office@realitysmolko.sk");
    expect(update).toHaveBeenCalledWith({ auth_user_id: "auth-new" });
    expect(linked?.id).toBe("prof-email");
  });
});
