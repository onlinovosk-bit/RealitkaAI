import { test, expect } from "@playwright/test";

/**
 * Vercel Preview smoke — public routes only, no CRON_SECRET / prod DB guard.
 * Spúšťa sa proti deployment_status.target_url (realitka-ai Preview).
 */

const PUBLIC_ROUTES = [
  { path: "/proof", name: "Proof funnel" },
  { path: "/import/universal", name: "Universal import" },
  { path: "/dashboard", name: "Dashboard" },
  { path: "/forecast", name: "Forecast" },
  { path: "/team", name: "Team" },
  { path: "/settings", name: "Settings" },
];

test.describe("Preview smoke: routes not 404/500", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.name} (${route.path})`, async ({ page }) => {
      const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
      const status = response?.status() ?? 0;
      expect(status, `${route.path} returned 404`).not.toBe(404);
      expect(status, `${route.path} returned 500`).not.toBe(500);
    });
  }
});

test.describe("Preview smoke: /proof content", () => {
  test("honest copy and stepper visible", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/proof", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Proof of Value")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/benchmarkov/)).toBeVisible();
    await expect(page.getByText(/Krok 1 \/ 6/)).toBeVisible();
  });
});
