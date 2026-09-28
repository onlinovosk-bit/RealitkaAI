import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

function read(relative: string): string {
  return readFileSync(join(CRM_ROOT, relative), "utf8");
}

describe("[verification] Profiles PATCH mutates through the scoped client", () => {
  it("the self-service patch path passes the request-scoped client", () => {
    const route = read("src/app/api/profiles/[id]/route.ts");

    expect(route).toContain("const supabase = await createClient()");
    expect(route).toContain("updateProfile(id, safePatch, supabase)");
    expect(route).not.toMatch(/updateProfile\(id, safePatch\)\s*;/);
  });

  it("the owner-only role/active path still uses the admin client", () => {
    const route = read("src/app/api/profiles/[id]/route.ts");

    expect(route).toContain("const admin = createAdminClient()");
    expect(route).toContain("Zmenu role alebo aktivity môže vykonať iba majiteľ.");
  });

  it("updateProfile accepts and forwards a scoped client", () => {
    const store = read("src/lib/team-store.ts");

    expect(store).toMatch(
      /export async function updateProfile\([\s\S]*?scoped\?: import\("@supabase\/supabase-js"\)\.SupabaseClient/,
    );
    expect(store).toContain("await resolveTenantSupabase(scoped)");
  });
});
