import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("[verification] team permission fallback is the strict set", () => {
  it("returns UNKNOWN_TEAM_PERMISSIONS when the permissions row cannot be read", () => {
    const route = readFileSync(
      join(process.cwd(), "src/app/api/nav/permissions/route.ts"),
      "utf8",
    );
    const nav = readFileSync(join(process.cwd(), "src/types/navigation.ts"), "utf8");

    expect(route).toContain("return NextResponse.json(UNKNOWN_TEAM_PERMISSIONS)");
    // Solo (bez team_license_id) je jediný povoľujúci default.
    expect(route).toContain("if (!profile.team_license_id)");
    const defaults = route.match(/return NextResponse\.json\(DEFAULT_TEAM_PERMISSIONS\)/g) ?? [];
    expect(defaults).toHaveLength(1);
    const solo = route.slice(route.indexOf("if (!profile.team_license_id)"));
    expect(solo).toContain("DEFAULT_TEAM_PERMISSIONS");

    expect(nav).toContain("can_export_contacts:        false");
    expect(nav).toMatch(/UNKNOWN_TEAM_PERMISSIONS[\s\S]*can_export_contacts:\s+false/);
  });
});
