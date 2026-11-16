import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = resolve(__dirname, "../../../..");

function read(rel: string): string {
  return readFileSync(resolve(repo, rel), "utf8");
}

describe("[verification] AI Control Tower subscription writes", () => {
  it("POST snapshot requires profiles.is_platform_admin, not FOUNDER_EMAILS", () => {
    const route = read("apps/crm/src/app/api/ai-control-tower/snapshots/route.ts");
    expect(route).toContain("requirePlatformAdmin");
    expect(route).not.toMatch(/FOUNDER_EMAILS/);
    expect(route).toContain("writeManualSubscriptionSnapshot");
  });

  it("page can show the tower to FOUNDER_EMAILS but form only to platform admin", () => {
    const page = read("apps/crm/src/app/(dashboard)/ai-control-tower/page.tsx");
    expect(page).toContain("canViewFounderMetrics");
    expect(page).toContain("canWriteSnapshots={isPlatformAdmin}");
    expect(page).toContain("is_platform_admin === true");
  });

  it("migration keeps RLS deny-by-default and no anon grant", () => {
    const sql = read("apps/crm/supabase/migrations/20261116140000_ai_quota_subscription_capacity.sql");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("ai_quota_snapshots_deny");
    expect(sql).toContain("using (false)");
    expect(sql).toContain("revoke all on public.ai_quota_snapshots from anon, authenticated");
    expect(sql).toMatch(/Do not apply to production/i);
  });
});
