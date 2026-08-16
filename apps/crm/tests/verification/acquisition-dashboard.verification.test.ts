import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();
const DASHBOARD_API = "/api/acquisition/dashboard";
const DASHBOARD_PAGE = "/acquisition";
const WEBHOOK_PATH = "/api/acquisition/google/lead-webhook";

function read(rel: string): string {
  return readFileSync(join(CRM_ROOT, rel), "utf8");
}

describe("[verification] Acquisition Stage 0 dashboard", () => {
  it("proxy session gate does not public-allowlist the dashboard API or page", () => {
    const proxy = read("src/proxy.ts");

    expect(proxy).toContain(`"${WEBHOOK_PATH}"`);

    expect(proxy).not.toContain(`"${DASHBOARD_API}"`);
    expect(proxy).not.toContain(`"${DASHBOARD_PAGE}"`);
  });

  it("dashboard handler authenticates with getUser and never reads agency_id from the client", () => {
    const route = read("src/app/api/acquisition/dashboard/route.ts");
    expect(route).toMatch(/getUser\s*\(/);
    expect(route).toContain("loadAcquisitionDashboard");
    expect(route).not.toMatch(/searchParams/);
    expect(route).not.toMatch(/request\.json/);
    expect(route).not.toContain("credential_ref");
  });

  it("dashboard select lists omit credential_ref and event metadata", () => {
    const loader = read("src/lib/acquisition/load-dashboard.ts");
    expect(loader).toContain("DASHBOARD_ACCOUNT_SELECT");
    expect(loader).not.toMatch(/credential_ref/);
    expect(loader).not.toMatch(/metadata/);
    expect(loader).toContain("lead_id");
    expect(loader).toContain("processing_status");
  });

  it("page is a read-only server view of the same loader (no Google Ads writes)", () => {
    const page = read("src/app/(dashboard)/acquisition/page.tsx");
    expect(page).toContain("loadAcquisitionDashboard");
    expect(page).not.toMatch(/mutate|googleAds:mutate|campaignBudget/);
    expect(page).toContain("force-dynamic");
  });
});
