import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

describe("[verification] profiles role/agency privilege freeze", () => {
  it("migration freezes role and agency_id for non-service_role", () => {
    const sql = readFileSync(
      join(
        CRM_ROOT,
        "supabase/migrations/20260830231500_profiles_guard_role_agency.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("profiles_guard_role_and_agency");
    expect(sql).toContain("BEFORE UPDATE OF role, agency_id");
    expect(sql).toContain("service_role");
    expect(sql).toContain("NEW.role := OLD.role");
    expect(sql).toContain("NEW.agency_id := OLD.agency_id");
  });

  it("onboarding/role refuses self-service escalation (no admin upsert)", () => {
    const route = readFileSync(
      join(CRM_ROOT, "src/app/api/onboarding/role/route.ts"),
      "utf8",
    );
    expect(route).not.toContain("createAdminClient");
    expect(route).toContain("403");
    expect(route).toMatch(/Self-service zmena role je zakázaná/);
  });

  it("profiles/[id] PATCH gates role via owner + admin client", () => {
    const route = readFileSync(
      join(CRM_ROOT, "src/app/api/profiles/[id]/route.ts"),
      "utf8",
    );
    expect(route).toContain("createAdminClient");
    expect(route).toContain("Fail-closed");
    expect(route).toMatch(/Vlastnú rolu nie je možné meniť/);
    expect(route).toMatch(/iba majiteľ/);
  });
});
