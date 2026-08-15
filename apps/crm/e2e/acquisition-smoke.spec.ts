import { test, expect, type Page } from "@playwright/test";
import { assertNotProduction } from "../tests/helpers/env-guard";

/**
 * Acquisition e2e smoke — local/CI only.
 *
 * /acquisition is an RSC under (dashboard)/layout. Both call
 * createClient().auth.getUser(), not getCurrentUser(), so E2E_BYPASS_AUTH
 * cannot open this page. page.route cannot stub loadAcquisitionDashboard.
 *
 * Seed rows (7024414113 / 2x PAUSED / 3x LOGGED_TEST) and the other-tenant
 * negative need two local seed users. Existing isolation helpers use
 * service-role or TEST_USER_* passwords — this lane forbids those secrets.
 * Unset local seed env => skip (not a fake PASS of tenant isolation).
 *
 * playwright.config.ts testDir is ./tests — this file is not in default
 * discovery. Run explicitly:
 *   cd apps/crm && npx playwright test e2e/acquisition-smoke.spec.ts --project=smoke
 *
 * Optional (never commit): ACQUISITION_E2E_EMAIL + ACQUISITION_E2E_PASSWORD
 * and ACQUISITION_E2E_OTHER_EMAIL + ACQUISITION_E2E_OTHER_PASSWORD.
 * Emails must be @local.test / @revolis.test / @example.com.
 */

assertNotProduction();
assertNotAppRevolis();

const SEED_CUSTOMER_ID = "7024414113";
const SEED_PAUSED = 2;
const SEED_LOGGED_TEST = 3;
const RENDER_MS = 15_000;
const LOCAL_SEED_EMAIL = /@(local\.test|revolis\.test|example\.com)$/i;

function assertNotAppRevolis(): void {
  const candidates = [
    process.env.PLAYWRIGHT_BASE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.BASE_URL,
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    let host = "";
    try {
      host = new URL(raw).hostname;
    } catch {
      if (/app\.revolis\.ai/i.test(raw)) {
        throw new Error("Acquisition e2e refused: target is app.revolis.ai");
      }
      continue;
    }
    if (host === "app.revolis.ai") {
      throw new Error("Acquisition e2e refused: target is app.revolis.ai");
    }
  }
}

function localSeedPair(
  emailKey: "ACQUISITION_E2E_EMAIL" | "ACQUISITION_E2E_OTHER_EMAIL",
  passwordKey: "ACQUISITION_E2E_PASSWORD" | "ACQUISITION_E2E_OTHER_PASSWORD",
): { email: string; password: string } | null {
  const email = process.env[emailKey]?.trim() ?? "";
  const password = process.env[passwordKey] ?? "";
  if (!email && !password) return null;
  if (!email || !password) {
    throw new Error(`${emailKey} and ${passwordKey} must be set together (local seed only).`);
  }
  if (!LOCAL_SEED_EMAIL.test(email)) {
    throw new Error(
      `${emailKey} must be a local seed address (@local.test / @revolis.test / @example.com).`,
    );
  }
  return { email, password };
}

async function loginLocalSeed(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login", { waitUntil: "load", timeout: 60_000 });
  await page.locator('input[name="email"]').waitFor({ state: "visible", timeout: 30_000 });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });
}

test.describe("Acquisition smoke (local/CI)", () => {
  test.describe.configure({ timeout: 90_000 });

  test("refuses production host and does not navigate to app.revolis.ai", async ({
    page,
    baseURL,
  }) => {
    expect(baseURL ?? "").not.toMatch(/app\.revolis\.ai/i);
    const response = await page.goto("/acquisition", {
      waitUntil: "domcontentloaded",
      timeout: RENDER_MS,
    });
    expect(page.url()).not.toMatch(/app\.revolis\.ai/i);
    expect(response?.status() ?? 0).not.toBe(500);
  });

  test("/acquisition document arrives in under 15s", async ({ page }) => {
    const started = Date.now();
    const response = await page.goto("/acquisition", {
      waitUntil: "domcontentloaded",
      timeout: RENDER_MS,
    });
    expect(Date.now() - started).toBeLessThan(RENDER_MS);
    expect(response?.status() ?? 0).not.toBe(500);
    expect(page.url()).not.toMatch(/app\.revolis\.ai/i);
  });

  test("seed tenant: account 7024414113, 2 PAUSED, 3 LOGGED_TEST", async ({ page }) => {
    const seed = localSeedPair("ACQUISITION_E2E_EMAIL", "ACQUISITION_E2E_PASSWORD");
    test.skip(
      !seed,
      "BLOCKER: no local seed user. RSC /acquisition ignores E2E_BYPASS_AUTH; TEST_USER_* / service-role are forbidden here. Set ACQUISITION_E2E_EMAIL+PASSWORD (@local.test) against a local DB that already has the Stage 0 seed.",
    );
    await loginLocalSeed(page, seed!.email, seed!.password);

    const started = Date.now();
    await page.goto("/acquisition", { waitUntil: "domcontentloaded", timeout: RENDER_MS });
    expect(Date.now() - started).toBeLessThan(RENDER_MS);

    await expect(page.getByRole("heading", { name: /Google Ads \(test\)/i })).toBeVisible({
      timeout: RENDER_MS,
    });
    await expect(page.getByText(SEED_CUSTOMER_ID).first()).toBeVisible();
    await expect(page.getByText("PAUSED")).toHaveCount(SEED_PAUSED);
    await expect(page.getByText("LOGGED_TEST")).toHaveCount(SEED_LOGGED_TEST);
  });

  test("other tenant does not see seed rows", async ({ page }) => {
    const other = localSeedPair("ACQUISITION_E2E_OTHER_EMAIL", "ACQUISITION_E2E_OTHER_PASSWORD");
    test.skip(
      !other,
      "BLOCKER: tenant isolation e2e needs a second local seed user. Harness has no secret-free tenant switch (E2E_BYPASS_AUTH is a single mock with agency_id null; valuation/RLS paths need service-role or passwords). Isolation is unit-tested in src/app/api/acquisition/dashboard/__tests__/route.test.ts — this skip is not a PASS.",
    );
    await loginLocalSeed(page, other!.email, other!.password);
    await page.goto("/acquisition", { waitUntil: "domcontentloaded", timeout: RENDER_MS });
    await expect(page.getByText(SEED_CUSTOMER_ID)).toHaveCount(0);
    await expect(page.getByText("LOGGED_TEST")).toHaveCount(0);
  });
});