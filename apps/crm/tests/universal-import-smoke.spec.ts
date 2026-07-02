import { test, expect } from "@playwright/test";
import { assertNotProduction } from "./helpers/env-guard";

assertNotProduction();

const BASE_URL = process.env.E2E_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

test.describe("Smoke: Universal CRM Import route", () => {
  test("GET /import/universal does not return 404", async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/import/universal`, {
      waitUntil: "domcontentloaded",
    });
    const status = response?.status() ?? 0;

    expect(status, "/import/universal returned 404").not.toBe(404);
    expect(status, "/import/universal returned 500").not.toBe(500);
  });

  test("GET /import/universal is not a Next.js 404 page", async ({ page }) => {
    await page.goto(`${BASE_URL}/import/universal`, { waitUntil: "domcontentloaded" });

    await expect(page).not.toHaveTitle(/404/i);

    if (page.url().includes("/login")) {
      test.skip(true, "Auth required — route exists (non-404), skipping UI assertion.");
    }

    await expect(page.getByRole("heading", { name: /Universal CRM Import/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});
