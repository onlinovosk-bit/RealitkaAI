import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(CRM_ROOT, rel), "utf8");
}

describe("[verification] workdesk topbar search", () => {
  it("topbar is a displayed-row filter, not a database search", () => {
    const src = read("src/components/layout/WorkdeskTopbar.tsx");
    expect(src).toContain("data-testid=\"workdesk-search-submit\"");
    expect(src).toContain("Filtrovať");
    expect(src).toContain("Filtrovať zobrazené — meno, lokalita, maklér");
    expect(src).toContain("router.push(q ? `/leads?q=${encodeURIComponent(q)}` : \"/leads\")");
    expect(src).not.toMatch(/id="workdesk-search"[\s\S]*readOnly/);
    expect(src).not.toContain("províziu");
    expect(src).not.toContain("Hľadať");
    expect(src).not.toContain('role="search"');
  });

  it("lead filters hydrate URL q and label the field as displayed filter", () => {
    const src = read("src/components/leads/lead-filters.tsx");
    expect(src).toContain("useSearchParams");
    expect(src).toContain('searchParams.get("q")');
    expect(src).toContain("setQ(urlQ)");
    expect(src).toContain("params.delete(\"q\")");
    expect(src).toContain("Filtrovať zobrazené");
    expect(src).toContain("lead.name, lead.email, lead.phone, lead.location, lead.budget, lead.status, lead.assignedAgent, lead.source");
  });

  it("semantic bar remains the search, and leads page is paged at 50", () => {
    const moduleSrc = read("src/components/leads/leads-module.tsx");
    expect(moduleSrc).toContain("Hľadať");
    expect(moduleSrc).toContain("V databáze príležitostí — nielen na tejto stránke.");
    expect(moduleSrc).toContain('type="leads"');

    const semantic = read("src/components/search/SemanticSearchBar.tsx");
    expect(semantic).toContain('"/api/search/semantic"');
    expect(semantic).toContain("Hľadať v databáze príležitostí");

    const store = read("src/lib/leads-store.ts");
    expect(store).toContain("export const LEADS_PAGE_SIZE = 50");
  });

  it("audit records SEARCH-PAGING as its own GO, not phase A", () => {
    const audit = readFileSync(
      join(CRM_ROOT, "../../docs/reports/2026-08-24-workdesk-search-architecture-audit.md"),
      "utf8",
    );
    expect(audit).toContain("SEARCH-PAGING-CLIENT-FILTER");
    expect(audit).toContain("SEARCH-TOPBAR-GLOBAL-VS-LOCAL");
    expect(audit).toContain("GO SEARCH-PAGING");
    expect(audit).toContain("neopravovať vo fáze A");
  });
});
