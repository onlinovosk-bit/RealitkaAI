import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(CRM_ROOT, rel), "utf8");
}

function fnBody(src: string, exportName: string, nextExportName: string): string {
  const start = src.indexOf(`export async function ${exportName}`);
  const end = src.indexOf(`export async function ${nextExportName}`);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

describe("[verification] crm lists pagination", () => {
  it("listLeads uses a narrow select and range paging instead of select(*) limit 500", () => {
    const src = read("src/lib/leads-store.ts");
    const body = fnBody(src, "listLeads", "getLead");
    expect(body).toContain("LEADS_LIST_SELECT");
    expect(body).toContain(".range(offset, offset + limit - 1)");
    expect(body).not.toMatch(/\.select\(["']\*["']\)/);
    expect(body).not.toContain(".limit(500)");
    expect(src).toContain("export const LEADS_PAGE_SIZE = 50");
  });

  it("listProperties pages with range and can select summary columns", () => {
    const src = read("src/lib/properties-store.ts");
    const start = src.indexOf("export async function listProperties");
    expect(start).toBeGreaterThan(-1);
    const body = src.slice(start, start + 3500);
    expect(body).toContain("PROPERTIES_SELECT_SUMMARY");
    expect(body).toContain(".range(offset, offset + limit - 1)");
    expect(body).not.toContain(".limit(500)");
  });

  it("dashboard SSR loads property summary columns instead of the full inventory", () => {
    const page = read("src/app/(dashboard)/dashboard/page.tsx");
    expect(page).toContain('columns: "summary"');
    expect(page).toContain("listProperties");
    expect(page).not.toContain("loadPropertiesInventory");
  });

  it("dashboard client pages leads at LEADS_PAGE_SIZE with load-more", () => {
    const client = read("src/app/(dashboard)/dashboard/DashboardPageClient.tsx");
    expect(client).toContain("LEADS_PAGE_SIZE");
    expect(client).toContain("listLeads");
    expect(client).toContain("loadMoreLeads");
    expect(client).not.toMatch(/getLeads\s*\(/);
  });

  it("leads bootstrap and inventory fetch a page of 50, not 500 *", () => {
    const bootstrap = read("src/lib/leads/leads-page-bootstrap.ts");
    expect(bootstrap).toContain("LEADS_PAGE_SIZE");
    expect(bootstrap).toContain("limit: LEADS_PAGE_SIZE");

    const inventory = read("src/app/api/leads/inventory/route.ts");
    expect(inventory).toContain("LEADS_LIST_SELECT");
    expect(inventory).toContain("LEADS_PAGE_SIZE");
    expect(inventory).not.toContain(".limit(500)");
    expect(inventory).not.toMatch(/\.select\(["']\*["']\)/);

    const client = read("src/components/leads/leads-page-client.tsx");
    expect(client).toContain("limit=${LEADS_PAGE_SIZE}");
    expect(client).toContain("loadMore");
  });
});
