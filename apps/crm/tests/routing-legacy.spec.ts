import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

test("Legacy team permissions URL does not 404", async ({ page }) => {
  await page.goto(`${BASE_URL}/team/permissions`);
  await expect(page).not.toHaveURL(/team\/permissions$/);
  await expect(page).not.toHaveTitle(/404/i);
});
