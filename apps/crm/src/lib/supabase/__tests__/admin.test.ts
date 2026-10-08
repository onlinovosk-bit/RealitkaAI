import { afterEach, describe, expect, it, vi } from "vitest";
import { createServiceRoleClient } from "@/lib/supabase/admin";

describe("createServiceRoleClient", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("použije SUPABASE_SERVICE_ROLE_KEY, keď je nastavený", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    expect(createServiceRoleClient()).not.toBeNull();
  });

  it("padne na SUPABASE_SECRET_KEY, keď je SERVICE_ROLE prázdny", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "   ");
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
    expect(createServiceRoleClient()).not.toBeNull();
  });

  it("vráti null, keď nie je žiadny kľúč", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    expect(createServiceRoleClient()).toBeNull();
  });
});
