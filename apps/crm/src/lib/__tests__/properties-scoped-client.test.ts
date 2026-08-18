import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveTenantSupabase = vi.fn();

vi.mock("@/lib/supabase/resolve-client", () => ({
  resolveTenantSupabase: (...args: unknown[]) => resolveTenantSupabase(...args),
}));

vi.mock("@/lib/demo-mode-cookie", () => ({
  readDemoModeFromCookie: vi.fn(async () => false),
}));

describe("properties-store scoped client", () => {
  beforeEach(() => {
    resolveTenantSupabase.mockReset();
  });

  it("updateProperty forwards scoped client to resolveTenantSupabase", async () => {
    const scoped = { from: vi.fn() } as unknown as import("@supabase/supabase-js").SupabaseClient;
    const eq = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "p1",
            agency_id: "a1",
            title: "T",
            location: "L",
            price: 1,
            type: "Byt",
            rooms: "2",
            features: [],
            status: "Aktívna",
            description: "",
            owner_name: "",
            owner_phone: "",
            created_at: null,
            updated_at: null,
          },
          error: null,
        }),
      }),
    });
    const update = vi.fn().mockReturnValue({ eq });
    (scoped.from as ReturnType<typeof vi.fn>).mockReturnValue({ update });
    resolveTenantSupabase.mockResolvedValue(scoped);

    const { updateProperty } = await import("@/lib/properties-store");
    await updateProperty("p1", { title: "T" }, scoped);

    expect(resolveTenantSupabase).toHaveBeenCalledWith(scoped);
    expect(scoped.from).toHaveBeenCalledWith("properties");
  });

  it("deleteProperty forwards scoped client to resolveTenantSupabase", async () => {
    const scoped = { from: vi.fn() } as unknown as import("@supabase/supabase-js").SupabaseClient;
    const eq = vi.fn().mockResolvedValue({ error: null });
    const del = vi.fn().mockReturnValue({ eq });
    (scoped.from as ReturnType<typeof vi.fn>).mockReturnValue({ delete: del });
    resolveTenantSupabase.mockResolvedValue(scoped);

    const { deleteProperty } = await import("@/lib/properties-store");
    await deleteProperty("p1", scoped);

    expect(resolveTenantSupabase).toHaveBeenCalledWith(scoped);
  });

  it("createProperty forwards scoped client to resolveTenantSupabase", async () => {
    const scoped = { from: vi.fn() } as unknown as import("@supabase/supabase-js").SupabaseClient;
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "p1",
        agency_id: "a1",
        title: "T",
        location: "L",
        price: 1,
        type: "Byt",
        rooms: "2",
        features: [],
        status: "Aktívna",
        description: "",
        owner_name: "",
        owner_phone: "",
        created_at: null,
        updated_at: null,
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    (scoped.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert });
    resolveTenantSupabase.mockResolvedValue(scoped);

    const { createProperty } = await import("@/lib/properties-store");
    await createProperty(
      {
        agencyId: "a1",
        title: "T",
        location: "L",
        price: 1,
        type: "Byt",
        rooms: "2",
        features: [],
        status: "Aktívna",
      },
      scoped,
    );

    expect(resolveTenantSupabase).toHaveBeenCalledWith(scoped);
  });
});
