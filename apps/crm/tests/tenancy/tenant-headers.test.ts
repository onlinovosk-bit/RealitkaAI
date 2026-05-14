import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  appendTenantHeadersToRequest,
  readTenantFromHeaders,
  resolveTenantFromSupabaseSession,
  TENANT_HEADER_AGENCY,
  TENANT_HEADER_PROFILE,
  TENANT_HEADER_USER,
} from "@/auth/tenant-headers";

function mockSessionClient(opts: {
  user: { id: string } | null;
  profile: { id: string; agency_id: string | null } | null;
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

describe("resolveTenantFromSupabaseSession", () => {
  it("returns null when there is no user", async () => {
    const supabase = mockSessionClient({ user: null, profile: null });
    await expect(resolveTenantFromSupabaseSession(supabase)).resolves.toBeNull();
  });

  it("returns tenant forward fields when profile exists", async () => {
    const supabase = mockSessionClient({
      user: { id: "auth-1" },
      profile: { id: "p1", agency_id: "ag-1" },
    });

    await expect(resolveTenantFromSupabaseSession(supabase)).resolves.toEqual({
      userId: "auth-1",
      profileId: "p1",
      agencyId: "ag-1",
    });
  });

  it("returns null when profile query fails", async () => {
    const supabase = mockSessionClient({
      user: { id: "auth-1" },
      profile: null,
      profileError: { message: "boom" },
    });

    await expect(resolveTenantFromSupabaseSession(supabase)).resolves.toBeNull();
  });
});

describe("appendTenantHeadersToRequest / readTenantFromHeaders", () => {
  it("round-trips tenant context via headers", () => {
    const base = new Headers({ "x-existing": "1" });
    const merged = appendTenantHeadersToRequest(base, {
      userId: "u",
      profileId: "p",
      agencyId: "a",
    });

    expect(merged.get("x-existing")).toBe("1");
    const read = readTenantFromHeaders(merged);
    expect(read.userId).toBe("u");
    expect(read.profileId).toBe("p");
    expect(read.agencyId).toBe("a");
    expect(merged.get(TENANT_HEADER_USER)).toBe("u");
    expect(merged.get(TENANT_HEADER_PROFILE)).toBe("p");
    expect(merged.get(TENANT_HEADER_AGENCY)).toBe("a");
  });
});
