import { describe, it, expect, vi } from "vitest";
import { resolveProfileForAuthUser } from "@/lib/profiles/resolve-profile-for-auth";

describe("resolveProfileForAuthUser", () => {
  it("uses auth_user_id or legacy id in profile query", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "prof-1", agency_id: "agency-1", auth_user_id: "user-1" },
    });
    const or = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ or });
    const from = vi.fn().mockReturnValue({ select });

    const supabase = { from } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const result = await resolveProfileForAuthUser(supabase, "user-1");

    expect(from).toHaveBeenCalledWith("profiles");
    expect(or).toHaveBeenCalledWith("auth_user_id.eq.user-1,id.eq.user-1");
    expect(result.profileMissingAgency).toBe(false);
    expect(result.profile?.agency_id).toBe("agency-1");
  });

  it("flags missing agency_id", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "prof-2", agency_id: null, auth_user_id: "user-2" },
    });
    const or = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ or });
    const from = vi.fn().mockReturnValue({ select });

    const supabase = { from } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const result = await resolveProfileForAuthUser(supabase, "user-2");

    expect(result.profileMissingAgency).toBe(true);
  });
});
