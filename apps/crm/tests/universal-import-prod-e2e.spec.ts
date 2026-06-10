import { test, expect } from "@playwright/test";
import path from "path";
import { assertNotProduction } from "./helpers/env-guard";

assertNotProduction();

const BASE_URL =
  process.env.E2E_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://app.revolis.ai";

const CSV_PATH = path.resolve(
  __dirname,
  "../src/lib/universal-import/__tests__/fixtures/smoke-realvia.csv",
);

test.describe("Prod smoke: Universal Import UI", () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    if (!email || !password) {
      test.skip(true, "TEST_USER_EMAIL / TEST_USER_PASSWORD missing");
    }

    await page.goto(`${BASE_URL}/login`, { waitUntil: "load", timeout: 60_000 });
    await page.locator('input[name="email"]').fill(email!);
    await page.locator('input[name="password"]').fill(password!);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 30_000 });
  });

  test("upload smoke-realvia.csv → imported=3, duplicate=0", async ({ page }) => {
    await page.goto(`${BASE_URL}/import/universal`, { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: /Universal CRM Import/i })).toBeVisible({
      timeout: 20_000,
    });

    await page.locator("select").first().selectOption("realvia");

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(CSV_PATH);

    await expect(page.getByRole("heading", { name: /Mapovanie stĺpcov/i })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("button", { name: /Náhľad/i }).click();

    await expect(page.getByRole("heading", { name: /Náhľad importu/i })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("button", { name: /Importovať 3 kontaktov/i }).click();

    await expect(page.getByRole("heading", { name: /Import hotový/i })).toBeVisible({
      timeout: 60_000,
    });

    const imported = page.locator("text=nových").locator("..").locator("span").first();
    const duplicates = page.locator("text=duplikátov").locator("..").locator("span").first();

    await expect(imported).toHaveText("3");
    await expect(duplicates).toHaveText("0");
  });
});
