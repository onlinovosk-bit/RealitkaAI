import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  TenantAccessDeniedError,
  withTenant,
} from "@/db/withTenant";

function mockClient(opts: {
  user: { id: string } | null;
  profile: { agency_id: string | null } | null;
  profileError?: { message: string } | null;
}): SupabaseClient {
  const maybeSingle = vi.fn(async () => ({
    data: opts.profileError ? null : opts.profile,
    error: opts.profileError ?? null,
  }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: opts.user },
        error: null,
      })),
    },
    from,
  } as unknown as SupabaseClient;
}

describe("withTenant", () => {
  it("runs callback when profile agency matches", async () => {
    const supabase = mockClient({
      user: { id: "u1" },
      profile: { agency_id: "a1" },
    });
    const fn = vi.fn(async () => 42);

    const result = await withTenant("a1", supabase, fn);

    expect(result).toBe(42);
    expect(fn).toHaveBeenCalledWith({ agencyId: "a1", supabase });
  });

  it("throws when not authenticated", async () => {
    const supabase = mockClient({ user: null, profile: null });

    await expect(
      withTenant("a1", supabase, async () => {}),
    ).rejects.toThrow(TenantAccessDeniedError);
  });

  it("throws when agency mismatches", async () => {
    const supabase = mockClient({
      user: { id: "u1" },
      profile: { agency_id: "a2" },
    });

    await expect(
      withTenant("a1", supabase, async () => {}),
    ).rejects.toThrow(TenantAccessDeniedError);
  });

  it("throws when profile has no agency", async () => {
    const supabase = mockClient({
      user: { id: "u1" },
      profile: { agency_id: null },
    });

    await expect(
      withTenant("a1", supabase, async () => {}),
    ).rejects.toThrow(TenantAccessDeniedError);
  });

  it("throws when profile query errors", async () => {
    const supabase = mockClient({
      user: { id: "u1" },
      profile: null,
      profileError: { message: "db down" },
    });

    await expect(
      withTenant("a1", supabase, async () => {}),
    ).rejects.toThrow(TenantAccessDeniedError);
  });
});
