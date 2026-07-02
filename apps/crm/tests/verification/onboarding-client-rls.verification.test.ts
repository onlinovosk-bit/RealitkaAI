import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

describe("[verification] B1 onboarding client tables RLS", () => {
  it("orphan GET /api/onboarding/mvp route is removed", () => {
    expect(
      existsSync(join(CRM_ROOT, "src/app/api/onboarding/mvp/route.ts")),
    ).toBe(false);
  });

  it("service_role-only RLS migration exists for both onboarding client tables", () => {
    const sql = readFileSync(
      join(CRM_ROOT, "supabase/migrations/20260701120000_onboarding_client_tables_rls.sql"),
      "utf8",
    );

    expect(sql).toContain("client_onboarding_messages enable row level security");
    expect(sql).toContain("client_onboarding_progress enable row level security");
    expect(sql).toContain('policy "service_role_only" on public.client_onboarding_messages');
    expect(sql).toContain('policy "service_role_only" on public.client_onboarding_progress');
    expect(sql).toContain("to service_role");
  });

  it("active onboarding API routes use service role client", () => {
    const paths = [
      "src/app/api/onboarding/mvp/checklist/route.ts",
      "src/app/api/onboarding/mvp/at-risk/route.ts",
      "src/app/api/onboarding/mvp/messages/schedule/route.ts",
      "src/app/api/demo/request/route.ts",
      "src/lib/onboarding-dispatch.ts",
    ];

    for (const rel of paths) {
      const src = readFileSync(join(CRM_ROOT, rel), "utf8");
      expect(src, rel).toContain("createServiceRoleClient");
    }
  });
});
