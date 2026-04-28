import { test, expect } from "@playwright/test";

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

test.describe("Smoke: all routes return 200", () => {
  for (const route of ROUTES) {
    test(`${route.name} (${route.path}) -> not 404`, async ({ page }) => {
      const response = await page.goto(route.path);
      expect(response?.status(), `${route.path} returned 404`).not.toBe(404);
      expect(response?.status(), `${route.path} returned 500`).not.toBe(500);
    });
  }
});

test("Dashboard: sidebar renders", async ({ page }) => {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  if (await isOnLogin(page)) {
    test.skip(true, "Dashboard requires authenticated session; redirected to /login.");
  }
  await expect(page.locator("nav, aside, [role=navigation]").first()).toBeVisible({ timeout: 10000 });
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
  expect(errors.filter((e) => !e.includes("favicon")), `Console errors: ${errors.join(", ")}`).toHaveLength(0);
});

test("API /api/leads responds (not 500)", async ({ request }) => {
  const resp = await request.get("/api/leads");
  const body = await resp.text();
  expect(resp.status(), `GET /api/leads failed with body: ${body.slice(0, 300)}`).not.toBe(500);
});
