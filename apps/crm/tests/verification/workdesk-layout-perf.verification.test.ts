import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(CRM_ROOT, rel), "utf8");
}

describe("[verification] workdesk layout perf", () => {
  it("dashboard layout does not load properties or leads inventories", () => {
    const layout = read("src/app/(dashboard)/layout.tsx");
    expect(layout).not.toMatch(/properties-store|leads-store|listProperties|listLeads/);
    expect(layout).toContain("linkProfileToAuthUser");
    expect(layout).toContain("resolveProfileForAuthUser");
  });

  it("profile lookup is request-memoized", () => {
    const resolver = read("src/lib/profiles/resolve-profile-for-auth.ts");
    expect(resolver).toContain("getAuthProfileRequestMemo");
    expect(resolver).toContain("findProfileForAuthUserUncached");
    expect(resolver).toContain("linkProfileToAuthUserUncached");
  });

  it("workdesk nav links disable Next.js prefetch of heavy routes", () => {
    const files = [
      "src/components/layout/AppSidebar.tsx",
      "src/components/layout/WorkdeskRail.tsx",
      "src/components/layout/mobile-nav.tsx",
      "src/components/layout/WorkdeskTopbar.tsx",
    ];
    for (const file of files) {
      const src = read(file);
      const links = src.match(/<Link\b[^>]*/g) ?? [];
      expect(links.length, file).toBeGreaterThan(0);
      for (const open of links) {
        if (open.includes('href="/login"') || open.includes("href={'/login'}")) continue;
        expect(open, file + " " + open).toContain("prefetch={false}");
      }
    }
  });
});