import { test, expect } from "@playwright/test";
import { assertNotProduction } from "./helpers/env-guard";

assertNotProduction();

/**
 * Production smoke suite — engineering_live z market-vision-capabilities.json
 * Cron: Authorization: Bearer $CRON_SECRET
 * Deprecated: /api/scoring, /api/segmentation → 410
 */

const CRON_SECRET = process.env.CRON_SECRET ?? "";
const cronAuthHeaders = (): Record<string, string> => ({
  Authorization: `Bearer ${CRON_SECRET}`,
});

const ENGINEERING_LIVE_CRONS = [
  { path: "/api/cron/pulse", method: "GET" as const },
  { path: "/api/cron/bri-snapshot", method: "GET" as const },
  { path: "/api/cron/morning-brief", method: "GET" as const },
  { path: "/api/cron/lead-ai-triage", method: "GET" as const },
  { path: "/api/cron/follow-up-sweep", method: "GET" as const },
  { path: "/api/cron/dashboard-insights", method: "GET" as const },
  { path: "/api/cron/arbitrage-scan", method: "GET" as const },
  { path: "/api/cron/price-trail-sync", method: "GET" as const },
  { path: "/api/cron/realvia-process", method: "GET" as const },
];

const DEPRECATED_ENDPOINTS = [
  { path: "/api/scoring", status: 410 },
  { path: "/api/segmentation", status: 410 },
  { path: "/api/scrape", status: 404 },
];

const ROUTES = [
  { path: "/dashboard", name: "Dashboard" },
  { path: "/forecast", name: "Forecast" },
  { path: "/team", name: "Team" },
  { path: "/team/permissions", name: "Team Permissions" },
  { path: "/billing", name: "Billing" },
  { path: "/settings", name: "Settings" },
];

async function isOnLogin(page: import("@playwright/test").Page) {
  await page.waitForLoadState("domcontentloaded");
  return page.url().includes("/login");
}

test.describe("Smoke: engineering_live cron endpoints", () => {
  for (const ep of ENGINEERING_LIVE_CRONS) {
    test(`${ep.method} ${ep.path} — rejects missing auth`, async ({ request }) => {
      const resp = await request.fetch(ep.path, { method: ep.method, timeout: 60_000 });
      expect([401, 403]).toContain(resp.status());
      const body = await resp.json();
      expect(body).toHaveProperty("error");
    });

    test(`${ep.method} ${ep.path} — accepts CRON_SECRET`, async ({ request }) => {
      test.skip(!CRON_SECRET, "CRON_SECRET not set in env");
      const resp = await request.fetch(ep.path, {
        method: ep.method,
        headers: cronAuthHeaders(),
      });
      expect(resp.status(), await resp.text()).not.toBe(401);
      expect(resp.status()).not.toBe(500);
      const body = await resp.json();
      expect(typeof body).toBe("object");
    });
  }
});

test.describe("Smoke: deprecated endpoints", () => {
  for (const ep of DEPRECATED_ENDPOINTS) {
    test(`GET ${ep.path} → ${ep.status}`, async ({ request }) => {
      const resp = await request.get(ep.path);
      expect(resp.status()).toBe(ep.status);
      if (ep.status === 410) {
        const body = await resp.json();
        expect(body).toHaveProperty("error");
      }
    });
  }
});

test.describe("Smoke: dashboard routes not 404/500", () => {
  for (const route of ROUTES) {
    test(`${route.name} (${route.path})`, async ({ page }) => {
      const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
      const status = response?.status() ?? 0;
      expect(status, `${route.path} returned 404`).not.toBe(404);
      expect(status, `${route.path} returned 500`).not.toBe(500);
    });
  }
});

test("Dashboard: sidebar renders", async ({ page }) => {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  if (await isOnLogin(page)) {
    test.skip(true, "Dashboard requires authenticated session; redirected to /login.");
  }
  await expect(page.locator("nav, aside, [role=navigation]").first()).toBeVisible({
    timeout: 10000,
  });
});

test("No JS errors on dashboard", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  if (await isOnLogin(page)) {
    test.skip(true, "Dashboard requires authenticated session; redirected to /login.");
  }
  await page.waitForLoadState("networkidle");
  expect(
    errors.filter((e) => !e.includes("favicon")),
    `Console errors: ${errors.join(", ")}`
  ).toHaveLength(0);
});

test("API GET /api/leads responds (not 500)", async ({ request }) => {
  const resp = await request.get("/api/leads");
  const body = await resp.text();
  expect(resp.status(), `GET /api/leads failed: ${body.slice(0, 300)}`).not.toBe(500);
});
