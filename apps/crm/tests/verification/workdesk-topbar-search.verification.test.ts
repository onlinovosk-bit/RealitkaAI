import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(CRM_ROOT, rel), "utf8");
}

describe("[verification] workdesk topbar search", () => {
  it("topbar search is a submit form that routes to /leads?q=", () => {
    const src = read("src/components/layout/WorkdeskTopbar.tsx");
    expect(src).toContain('role="search"');
    expect(src).toContain("data-testid=\"workdesk-search-submit\"");
    expect(src).toContain("Hľadať");
    expect(src).toContain("router.push(q ? `/leads?q=${encodeURIComponent(q)}` : \"/leads\")");
    expect(src).not.toMatch(/id="workdesk-search"[\s\S]*readOnly/);
  });

  it("lead filters hydrate and stay in sync with URL q", () => {
    const src = read("src/components/leads/lead-filters.tsx");
    expect(src).toContain("useSearchParams");
    expect(src).toContain('searchParams.get("q")');
    expect(src).toContain("setQ(urlQ)");
    expect(src).toContain("params.delete(\"q\")");
  });
});
